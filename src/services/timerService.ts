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
      // Send sit down reminder after standing timer expires
      this.sendSitReminder(session);
    }, standDurationMinutes * 60 * 1000);

    this.sessionManager.updateSession(session.userId, {
      status: 'standing',
      currentTimer: timer,
      lastActionTime: new Date(),
      reminderTimer: undefined,
      isManualStandup: isManual,
    });

    // Start standing status updater
    this.startStandingStatusUpdater(session);
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


  private async sendSitReminder(session: UserSession): Promise<void> {
    try {
      // Clear standing timer
      if (session.currentTimer) {
        clearTimeout(session.currentTimer);
      }
      
      const standMinutes = session.isManualStandup ? 10 : session.standDurationMinutes;
      const message = MESSAGES.TIME_TO_SIT.replace('%d', standMinutes.toString());
      
      // Send reminder with sit down button
      const keyboard = {
        inline_keyboard: [[
          { text: KEYBOARD_BUTTONS.SIT_DOWN, callback_data: 'sit_down' }
        ]]
      };

      const sentMessage = await this.bot.sendMessage(session.chatId, message, {
        reply_markup: keyboard
      });

      this.sessionManager.updateSession(session.userId, {
        lastMessageId: sentMessage.message_id,
        currentTimer: undefined,
      });

      // Set a 5-minute timer for auto sit down if user doesn't respond
      const autoSitTimer = setTimeout(() => {
        this.autoSitDownAfterReminder(session);
      }, 5 * 60 * 1000);

      this.sessionManager.updateSession(session.userId, {
        currentTimer: autoSitTimer,
      });

      console.log(`坐下提醒已發送 - 使用者: ${session.userId}`);
    } catch (error) {
      console.error('發送坐下提醒失敗:', error);
    }
  }

  private async autoSitDownAfterReminder(session: UserSession): Promise<void> {
    try {
      // Send notification about auto-sit
      await this.bot.sendMessage(
        session.chatId, 
        '⏰ 已經過了 5 分鐘，系統自動幫您開始坐下計時。'
      );
      
      // Send the normal sitting message with stand button
      const keyboard = {
        inline_keyboard: [[
          { text: KEYBOARD_BUTTONS.STAND_UP, callback_data: 'stand_up_early' }
        ]]
      };

      const sentMessage = await this.bot.sendMessage(session.chatId, MESSAGES.START_SITTING, {
        reply_markup: keyboard
      });

      this.sessionManager.updateSession(session.userId, {
        status: 'sitting',
        lastMessageId: sentMessage.message_id,
        lastActionTime: new Date(),
        sessionStartTime: new Date(),
      });

      // Start sitting timer and status updater
      this.startSittingTimer(session);
      this.startStatusUpdater(session);

      console.log(`自動坐下已觸發（5分鐘後） - 使用者: ${session.userId}`);
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

  async updateStandingStatus(session: UserSession): Promise<void> {
    if (!session.lastMessageId || session.status !== 'standing') return;

    const elapsedMinutes = this.sessionManager.getElapsedMinutes(session);
    const standDurationMinutes = session.isManualStandup ? 10 : session.standDurationMinutes;
    const message = `🚶 *站立中*\n\n⏱ 已站立 ${elapsedMinutes} 分鐘 / ${standDurationMinutes} 分鐘`;

    const keyboard = {
      inline_keyboard: [[
        { text: KEYBOARD_BUTTONS.SIT_DOWN, callback_data: 'sit_down' }
      ]]
    };

    try {
      await this.bot.editMessageText(message, {
        chat_id: session.chatId,
        message_id: session.lastMessageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('更新站立狀態失敗:', error);
    }
  }

  startStandingStatusUpdater(session: UserSession): void {
    const updateInterval = setInterval(async () => {
      const currentSession = this.sessionManager.getSession(session.userId);
      if (!currentSession || currentSession.status !== 'standing') {
        clearInterval(updateInterval);
        return;
      }
      await this.updateStandingStatus(currentSession);
    }, 60 * 1000); // 每分鐘更新一次
  }
}