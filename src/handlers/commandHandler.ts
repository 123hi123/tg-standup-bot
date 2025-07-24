import TelegramBot from 'node-telegram-bot-api';
import moment from 'moment-timezone';
import { SessionManager } from '../services/sessionManager';
import { TimerService } from '../services/timerService';
import { MESSAGES, KEYBOARD_BUTTONS } from '../config/constants';

export class CommandHandler {
  constructor(
    private bot: TelegramBot,
    private sessionManager: SessionManager,
    private timerService: TimerService
  ) {}

  async handleStart(msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    if (!userId) return;

    let session = this.sessionManager.getSession(userId);
    
    if (session && session.status !== 'idle') {
      await this.bot.sendMessage(chatId, MESSAGES.ALREADY_STARTED);
      return;
    }

    if (!session) {
      session = this.sessionManager.createSession(userId, chatId);
    }

    // Check if it's after 9:10 AM on a weekday in Taiwan timezone
    const now = moment().tz('Asia/Taipei');
    const dayOfWeek = now.day();
    const currentTime = now.format('HH:mm');
    
    let isAutoSit = false;
    let startMessage = MESSAGES.START_SITTING;
    
    // Monday (1) to Friday (5) after 9:10 AM
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && currentTime >= '09:10') {
      isAutoSit = true;
      startMessage = `🪑 *自動坐下模式*\n\n系統偵測到現在是工作時間（週一至週五 ${currentTime}），已為您開始計時坐下。\n\n⏱ 將在 ${session.sitDurationMinutes} 分鐘後提醒您站起來活動`;
    }

    const keyboard = {
      inline_keyboard: [[
        { text: KEYBOARD_BUTTONS.STAND_UP, callback_data: 'stand_up_early' }
      ]]
    };

    const sentMessage = await this.bot.sendMessage(chatId, startMessage, {
      reply_markup: keyboard,
      parse_mode: isAutoSit ? 'Markdown' : undefined
    });

    this.sessionManager.updateSession(userId, {
      lastMessageId: sentMessage.message_id,
    });

    this.timerService.startSittingTimer(session);
    this.timerService.startStatusUpdater(session);
  }

  async handleStop(msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    if (!userId) return;

    const session = this.sessionManager.getSession(userId);
    if (!session || session.status === 'idle') {
      await this.bot.sendMessage(chatId, MESSAGES.NOT_STARTED);
      return;
    }

    this.sessionManager.deleteSession(userId);
    await this.bot.sendMessage(chatId, MESSAGES.STOPPED);
  }

  async handleSettings(msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    if (!userId) return;

    const text = msg.text || '';
    const parts = text.split(' ');

    if (parts.length !== 3) {
      const currentSettings = this.sessionManager.getUserSettings(userId);
      const message = `當前設定：\n坐下時間：${currentSettings.sitDurationMinutes} 分鐘\n站立時間：${currentSettings.standDurationMinutes} 分鐘\n\n${MESSAGES.INVALID_SETTINGS}`;
      await this.bot.sendMessage(chatId, message);
      return;
    }

    const sitMinutes = parseInt(parts[1]);
    const standMinutes = parseInt(parts[2]);

    if (isNaN(sitMinutes) || isNaN(standMinutes) || sitMinutes < 1 || standMinutes < 1) {
      await this.bot.sendMessage(chatId, MESSAGES.INVALID_SETTINGS);
      return;
    }

    this.sessionManager.updateUserSettings(userId, sitMinutes, standMinutes);
    const message = MESSAGES.SETTINGS_UPDATED
      .replace('%d', sitMinutes.toString())
      .replace('%d', standMinutes.toString());
    
    await this.bot.sendMessage(chatId, message);
  }

  async handleStatus(msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    if (!userId) return;

    const session = this.sessionManager.getSession(userId);
    if (!session || session.status === 'idle') {
      await this.bot.sendMessage(chatId, MESSAGES.NOT_STARTED);
      return;
    }

    const statusText = session.status === 'sitting' ? MESSAGES.STATUS_SITTING : MESSAGES.STATUS_STANDING;
    const elapsedMinutes = this.sessionManager.getElapsedMinutes(session);
    
    const message = MESSAGES.CURRENT_STATUS
      .replace('%s', statusText)
      .replace('%d', elapsedMinutes.toString());
    
    await this.bot.sendMessage(chatId, message);
  }

  async handleHelp(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    await this.bot.sendMessage(chatId, MESSAGES.WELCOME);
  }
}