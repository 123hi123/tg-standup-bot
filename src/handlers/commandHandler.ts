import TelegramBot from 'node-telegram-bot-api';
import { SessionManager } from '../services/sessionManager';
import { TimerService } from '../services/timerService';
import { UserRegistry } from '../services/userRegistry';
import { MESSAGES, KEYBOARD_BUTTONS } from '../config/constants';

export class CommandHandler {
  constructor(
    private bot: TelegramBot,
    private sessionManager: SessionManager,
    private timerService: TimerService,
    private userRegistry: UserRegistry
  ) {}

  async handleStart(msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    if (!userId) return;

    // Register user in the registry
    this.userRegistry.registerUser(userId, chatId);

    let session = this.sessionManager.getSession(userId);
    
    if (session && session.status !== 'idle') {
      await this.bot.sendMessage(chatId, MESSAGES.ALREADY_STARTED);
      return;
    }

    if (!session) {
      session = this.sessionManager.createSession(userId, chatId);
    }

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

  async handleAutoSit(msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    if (!userId) return;

    const text = msg.text || '';
    const parts = text.split(' ');

    if (parts.length === 1) {
      // Show current status
      const user = this.userRegistry.getUser(userId);
      const status = (user?.autoSitEnabled ?? true) ? '開啟' : '關閉';
      await this.bot.sendMessage(
        chatId,
        `🪑 *自動坐下功能*\n\n目前狀態：${status}\n\n使用 \`/autosit on\` 開啟\n使用 \`/autosit off\` 關閉`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const action = parts[1].toLowerCase();
    if (action === 'on') {
      this.userRegistry.registerUser(userId, chatId);
      this.userRegistry.setAutoSitEnabled(userId, true);
      await this.bot.sendMessage(
        chatId,
        '✅ 已開啟自動坐下功能\n\n系統將在每個工作日的 9:10 AM 自動幫您開始坐下計時。',
        { parse_mode: 'Markdown' }
      );
    } else if (action === 'off') {
      this.userRegistry.registerUser(userId, chatId);
      this.userRegistry.setAutoSitEnabled(userId, false);
      await this.bot.sendMessage(
        chatId,
        '❌ 已關閉自動坐下功能\n\n您需要手動使用 /start 開始計時。',
        { parse_mode: 'Markdown' }
      );
    } else {
      await this.bot.sendMessage(
        chatId,
        '❌ 無效的參數\n\n使用 `/autosit on` 開啟\n使用 `/autosit off` 關閉',
        { parse_mode: 'Markdown' }
      );
    }
  }
}