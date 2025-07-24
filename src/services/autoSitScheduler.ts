import * as cron from 'node-cron';
import moment from 'moment-timezone';
import TelegramBot from 'node-telegram-bot-api';
import { SessionManager } from './sessionManager';

export class AutoSitScheduler {
  private job: cron.ScheduledTask | null = null;
  private bot: TelegramBot;
  private sessionManager: SessionManager;

  constructor(bot: TelegramBot, sessionManager: SessionManager) {
    this.bot = bot;
    this.sessionManager = sessionManager;
  }

  start(): void {
    // Schedule for 9:10 AM Taiwan time, Monday to Friday
    this.job = cron.schedule('10 9 * * 1-5', () => {
      this.checkAndAutoSit();
    }, {
      timezone: 'Asia/Taipei'
    });

    console.log('自動坐下排程已啟動 (週一至週五 9:10 AM)');
  }

  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('自動坐下排程已停止');
    }
  }

  private async checkAndAutoSit(): Promise<void> {
    const sessions = this.sessionManager.getAllSessions();
    
    for (const [userId, session] of sessions) {
      // Only auto-sit if user is idle or standing
      if (session.status === 'idle' || session.status === 'standing') {
        try {
          // Start sitting session
          this.sessionManager.updateSession(userId, {
            status: 'sitting',
            sessionStartTime: new Date(),
            lastActionTime: new Date()
          });

          // Start the sitting timer
          await this.sessionManager.startSittingTimer(userId);

          // Send notification
          await this.bot.sendMessage(
            session.chatId,
            '🪑 *自動坐下提醒*\n\n系統偵測到現在是工作時間（週一至週五 9:10 AM），已自動為您開始計時坐下 45 分鐘。\n\n記得適時站起來活動喔！',
            { parse_mode: 'Markdown' }
          );

          console.log(`自動坐下已啟動 - 使用者: ${userId}`);
        } catch (error) {
          console.error(`自動坐下失敗 - 使用者 ${userId}:`, error);
        }
      }
    }
  }

  // Check if current time is after 9:10 AM on weekdays in Taiwan timezone
  isAfterWorkStart(): boolean {
    const now = moment().tz('Asia/Taipei');
    const dayOfWeek = now.day();
    const currentTime = now.format('HH:mm');
    
    // Monday (1) to Friday (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return currentTime >= '09:10';
    }
    
    return false;
  }
}