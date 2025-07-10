import TelegramBot from 'node-telegram-bot-api';
import { SessionManager } from '../services/sessionManager';
import { TimerService } from '../services/timerService';
import { CommandHandler } from '../handlers/commandHandler';
import { CallbackHandler } from '../handlers/callbackHandler';
import { BotCommand } from '../types';

export class StandUpBot {
  private bot: TelegramBot;
  private sessionManager: SessionManager;
  private timerService: TimerService;
  private commandHandler: CommandHandler;
  private callbackHandler: CallbackHandler;

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.sessionManager = new SessionManager();
    this.timerService = new TimerService(this.bot, this.sessionManager);
    this.commandHandler = new CommandHandler(this.bot, this.sessionManager, this.timerService);
    this.callbackHandler = new CallbackHandler(this.bot, this.sessionManager, this.timerService);
  }

  async init(): Promise<void> {
    await this.setBotCommands();
    this.registerHandlers();
    console.log('機器人已啟動！');
  }

  private async setBotCommands(): Promise<void> {
    const commands: BotCommand[] = [
      { command: 'start', description: '開始計時' },
      { command: 'stop', description: '停止計時' },
      { command: 'status', description: '查看當前狀態' },
      { command: 'settings', description: '調整設定' },
      { command: 'help', description: '顯示幫助訊息' },
    ];

    await this.bot.setMyCommands(commands);
  }

  private registerHandlers(): void {
    // 指令處理
    this.bot.onText(/\/start/, (msg) => this.commandHandler.handleStart(msg));
    this.bot.onText(/\/stop/, (msg) => this.commandHandler.handleStop(msg));
    this.bot.onText(/\/status/, (msg) => this.commandHandler.handleStatus(msg));
    this.bot.onText(/\/settings/, (msg) => this.commandHandler.handleSettings(msg));
    this.bot.onText(/\/help/, (msg) => this.commandHandler.handleHelp(msg));

    // Callback 查詢處理
    this.bot.on('callback_query', (query) => this.callbackHandler.handleCallback(query));

    // 錯誤處理
    this.bot.on('polling_error', (error) => {
      console.error('Polling error:', error);
    });
  }
}