import TelegramBot from 'node-telegram-bot-api';
import { UserSession } from '../types';
import { SessionManager } from './sessionManager';
import { MESSAGES, KEYBOARD_BUTTONS, REMINDER_INTERVAL_MS } from '../config/constants';

export class TimerService {
  constructor(
    private bot: TelegramBot,
    private sessionManager: SessionManager
  ) {}

  startSittingTimer(session: UserSession): void {
    if (session.currentTimer) {
      clearTimeout(session.currentTimer);
    }
    if (session.reminderTimer) {
      clearInterval(session.reminderTimer);
    }

    const timer = setTimeout(() => {
      this.sendStandReminder(session);
    }, session.sitDurationMinutes * 60 * 1000);

    this.sessionManager.updateSession(session.userId, {
      status: 'sitting',
      currentTimer: timer,
      lastActionTime: new Date(),
      reminderTimer: undefined,
    });
  }

  startStandingTimer(session: UserSession, isManual: boolean = false): void {
    if (session.currentTimer) {
      clearTimeout(session.currentTimer);
    }
    if (session.reminderTimer) {
      clearInterval(session.reminderTimer);
    }

    // If manual standup, use 10 minutes; otherwise use configured duration (5 minutes)
    const standDurationMinutes = isManual ? 10 : session.standDurationMinutes;
    
    const timer = setTimeout(() => {
      // Auto sit down after standing timer expires
      this.autoSitDown(session);
    }, standDurationMinutes * 60 * 1000);

    this.sessionManager.updateSession(session.userId, {
      status: 'standing',
      currentTimer: timer,
      lastActionTime: new Date(),
      reminderTimer: undefined,
      isManualStandup: isManual,
    });
  }

  private async sendStandReminder(session: UserSession): Promise<void> {
    const message = MESSAGES.TIME_TO_STAND.replace('%d', session.sitDurationMinutes.toString());
    
    const keyboard = {
      inline_keyboard: [[
        { text: KEYBOARD_BUTTONS.STAND_UP, callback_data: 'stand_up' }
      ]]
    };

    try {
      const sentMessage = await this.bot.sendMessage(session.chatId, message, {
        reply_markup: keyboard
      });

      let reminderCount = 0;
      const reminderTimer = setInterval(async () => {
        reminderCount++;
        const reminderMessage = MESSAGES.STAND_REMINDER.replace('%d', reminderCount.toString());
        
        try {
          await this.bot.sendMessage(session.chatId, reminderMessage, {
            reply_markup: keyboard
          });
        } catch (error) {
          console.error('發送提醒失敗:', error);
        }
      }, REMINDER_INTERVAL_MS);

      this.sessionManager.updateSession(session.userId, {
        reminderTimer,
        lastMessageId: sentMessage.message_id,
      });
    } catch (error) {
      console.error('發送站立提醒失敗:', error);
    }
  }


  private async autoSitDown(session: UserSession): Promise<void> {
    try {
      // Start sitting timer automatically
      this.startSittingTimer(session);
      
      // Send auto-sit notification
      const standMinutes = session.isManualStandup ? 10 : session.standDurationMinutes;
      const message = `🪑 *自動坐下*\n\n您已站立 ${standMinutes} 分鐘，系統已自動為您開始計時坐下。\n\n記得保持良好的坐姿喔！`;
      
      await this.bot.sendMessage(session.chatId, message, {
        parse_mode: 'Markdown'
      });

      console.log(`自動坐下已觸發 - 使用者: ${session.userId}`);
    } catch (error) {
      console.error('自動坐下失敗:', error);
    }
  }

  async updateSittingStatus(session: UserSession): Promise<void> {
    if (!session.lastMessageId || session.status !== 'sitting') return;

    const elapsedMinutes = this.sessionManager.getElapsedMinutes(session);
    const message = `${MESSAGES.START_SITTING}\n\n⏱ 已坐下 ${elapsedMinutes} 分鐘`;

    const keyboard = {
      inline_keyboard: [[
        { text: KEYBOARD_BUTTONS.STAND_UP, callback_data: 'stand_up_early' }
      ]]
    };

    try {
      await this.bot.editMessageText(message, {
        chat_id: session.chatId,
        message_id: session.lastMessageId,
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('更新坐下狀態失敗:', error);
    }
  }

  startStatusUpdater(session: UserSession): void {
    const updateInterval = setInterval(async () => {
      const currentSession = this.sessionManager.getSession(session.userId);
      if (!currentSession || currentSession.status !== 'sitting') {
        clearInterval(updateInterval);
        return;
      }
      await this.updateSittingStatus(currentSession);
    }, 60 * 1000); // 每分鐘更新一次
  }
}