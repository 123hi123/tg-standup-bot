import TelegramBot from 'node-telegram-bot-api';
import { SessionManager } from '../services/sessionManager';
import { TimerService } from '../services/timerService';
import { MESSAGES, KEYBOARD_BUTTONS } from '../config/constants';

export class CallbackHandler {
  constructor(
    private bot: TelegramBot,
    private sessionManager: SessionManager,
    private timerService: TimerService
  ) {}

  async handleCallback(query: TelegramBot.CallbackQuery): Promise<void> {
    const userId = query.from.id;
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    const data = query.data;

    if (!chatId || !messageId || !data) return;

    const session = this.sessionManager.getSession(userId);
    if (!session) {
      await this.bot.answerCallbackQuery(query.id, { text: '請先使用 /start 開始計時' });
      return;
    }

    switch (data) {
      case 'stand_up':
        // 當坐滿時間後的提醒按鈕，直接站立
        await this.handleStandUp(query, userId, chatId);
        break;
      
      case 'stand_up_early':
        await this.handleStandUpEarly(query, userId, chatId);
        break;
      
      case 'sit_down':
        await this.handleSitDown(query, userId, chatId);
        break;
      
      default:
        await this.bot.answerCallbackQuery(query.id);
    }
  }

  private async handleStandUp(query: TelegramBot.CallbackQuery, userId: number, chatId: number): Promise<void> {
    const session = this.sessionManager.getSession(userId);
    if (!session) return;

    // 清除提醒計時器
    if (session.reminderTimer) {
      clearInterval(session.reminderTimer);
    }

    // 發送站立中訊息（坐滿時間後的正常站立）
    const message = `🚶 *站立中*\n\n你已經完成了 ${session.sitDurationMinutes} 分鐘的坐下時間！\n\n⏱ 將在 ${session.standDurationMinutes} 分鐘後自動坐下`;
    
    const keyboard = {
      inline_keyboard: [[
        { text: KEYBOARD_BUTTONS.SIT_DOWN, callback_data: 'sit_down' }
      ]]
    };
    
    const sentMessage = await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
    this.sessionManager.updateSession(userId, {
      lastMessageId: sentMessage.message_id,
      reminderTimer: undefined,
    });

    // 開始站立計時 (正常站立，使用設定的站立時間)
    this.timerService.startStandingTimer(session, false);
    
    await this.bot.answerCallbackQuery(query.id, { text: '已記錄你站起來了！' });
  }

  private async handleStandUpEarly(query: TelegramBot.CallbackQuery, userId: number, chatId: number): Promise<void> {
    const session = this.sessionManager.getSession(userId);
    if (!session || session.status !== 'sitting') return;

    // 清除當前計時器
    if (session.currentTimer) {
      clearTimeout(session.currentTimer);
    }

    const elapsedMinutes = this.sessionManager.getElapsedMinutes(session);
    const isEarly = elapsedMinutes < session.sitDurationMinutes;
    
    let message = `🚶 *手動站立*\n\n`;
    if (isEarly) {
      message += `你提早站起來了！已經坐了 ${elapsedMinutes} 分鐘。`;
    } else {
      message += `已經坐了 ${elapsedMinutes} 分鐘。`;
    }
    message += `\n\n⏱ 將在 10 分鐘後自動坐下`;

    const keyboard = {
      inline_keyboard: [[
        { text: KEYBOARD_BUTTONS.SIT_DOWN, callback_data: 'sit_down' }
      ]]
    };

    const sentMessage = await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    this.sessionManager.updateSession(userId, {
      status: 'standing',
      currentTimer: undefined,
      lastMessageId: sentMessage.message_id,
      lastActionTime: new Date(),
      isManualStandup: true,
    });

    // 開始站立計時 (手動觸發，10分鐘)
    this.timerService.startStandingTimer(session, true);

    await this.bot.answerCallbackQuery(query.id, { text: '已記錄你站起來了！將在10分鐘後自動坐下' });
  }

  private async handleSitDown(query: TelegramBot.CallbackQuery, userId: number, chatId: number): Promise<void> {
    const session = this.sessionManager.getSession(userId);
    if (!session) return;

    // 清除站立計時器
    if (session.currentTimer) {
      clearTimeout(session.currentTimer);
    }

    // 開始新的坐下計時
    const keyboard = {
      inline_keyboard: [[
        { text: KEYBOARD_BUTTONS.STAND_UP, callback_data: 'stand_up_early' }
      ]]
    };

    const sentMessage = await this.bot.sendMessage(chatId, MESSAGES.START_SITTING, {
      reply_markup: keyboard
    });

    this.sessionManager.updateSession(userId, {
      lastMessageId: sentMessage.message_id,
    });

    this.timerService.startSittingTimer(session);
    this.timerService.startStatusUpdater(session);
    
    await this.bot.answerCallbackQuery(query.id, { text: '已記錄你坐下了！' });
  }
}