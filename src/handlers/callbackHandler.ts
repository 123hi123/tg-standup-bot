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

    // 發送站立中訊息
    const sentMessage = await this.bot.sendMessage(chatId, MESSAGES.STANDING);
    
    this.sessionManager.updateSession(userId, {
      lastMessageId: sentMessage.message_id,
      reminderTimer: undefined,
    });

    // 開始站立計時
    this.timerService.startStandingTimer(session);
    
    await this.bot.answerCallbackQuery(query.id, { text: '已記錄你站起來了！' });
  }

  private async handleStandUpEarly(query: TelegramBot.CallbackQuery, userId: number, chatId: number): Promise<void> {
    const session = this.sessionManager.getSession(userId);
    if (!session || session.status !== 'sitting') return;

    // 清除當前計時器
    if (session.currentTimer) {
      clearTimeout(session.currentTimer);
    }

    // 詢問是否要坐下
    const keyboard = {
      inline_keyboard: [[
        { text: KEYBOARD_BUTTONS.SIT_DOWN, callback_data: 'sit_down' }
      ]]
    };

    const elapsedMinutes = this.sessionManager.getElapsedMinutes(session);
    const message = `你提早站起來了！已經坐了 ${elapsedMinutes} 分鐘。\n\n站立結束後請點擊下方按鈕：`;

    const sentMessage = await this.bot.sendMessage(chatId, message, {
      reply_markup: keyboard
    });

    this.sessionManager.updateSession(userId, {
      status: 'standing',
      currentTimer: undefined,
      lastMessageId: sentMessage.message_id,
      lastActionTime: new Date(),
    });

    await this.bot.answerCallbackQuery(query.id, { text: '已記錄你站起來了！' });
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