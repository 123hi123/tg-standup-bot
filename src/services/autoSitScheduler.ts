import * as cron from 'node-cron';
import moment from 'moment-timezone';
import TelegramBot from 'node-telegram-bot-api';
import { SessionManager } from './sessionManager';

export class AutoSitScheduler {
  private startJob: cron.ScheduledTask | null = null;
  private stopJob: cron.ScheduledTask | null = null;
  private bot: TelegramBot;
  private sessionManager: SessionManager;

  constructor(bot: TelegramBot, sessionManager: SessionManager) {
    this.bot = bot;
    this.sessionManager = sessionManager;
  }

  start(): void {
    // Schedule for 9:10 AM Taiwan time, Monday to Friday
    this.startJob = cron.schedule('10 9 * * 1-5', () => {
      this.checkAndAutoSit();
    }, {
      timezone: 'Asia/Taipei'
    });

    // Schedule for 6:00 PM Taiwan time, Monday to Friday
    this.stopJob = cron.schedule('0 18 * * 1-5', () => {
      this.checkAndAutoStop();
    }, {
      timezone: 'Asia/Taipei'
    });

    console.log('自動排程已啟動:');
    console.log('- 自動坐下: 週一至週五 9:10 AM');
    console.log('- 自動停止: 週一至週五 6:00 PM');
  }

  stop(): void {
    if (this.startJob) {
      this.startJob.stop();
      this.startJob = null;
    }
    if (this.stopJob) {
      this.stopJob.stop();
      this.stopJob = null;
    }
    console.log('自動排程已停止');
  }

  private async checkAndAutoSit(): Promise<void> {
    const sessions = this.sessionManager.getAllSessions();
    
    for (const [userId, session] of sessions) {
      // Auto-sit if user is not currently sitting
      if (session.status !== 'sitting') {
        try {
          // First send notification about auto-sit
          await this.bot.sendMessage(
            session.chatId,
            '🪑 *自動開始坐下計時*\n\n現在是 9:10 AM，系統已自動幫您按下坐下按鈕。',
            { parse_mode: 'Markdown' }
          );

          // Then send the normal sitting message with stand button
          const keyboard = {
            inline_keyboard: [[
              { text: '🚶 站起來', callback_data: 'stand_up_early' }
            ]]
          };

          const sentMessage = await this.bot.sendMessage(
            session.chatId, 
            '開始計時！你已經坐下了。',
            { reply_markup: keyboard }
          );

          // Update session
          this.sessionManager.updateSession(userId, {
            status: 'sitting',
            sessionStartTime: new Date(),
            lastActionTime: new Date(),
            lastMessageId: sentMessage.message_id
          });

          // Start the sitting timer
          await this.sessionManager.startSittingTimer(userId);

          console.log(`自動坐下已啟動 - 使用者: ${userId}`);
        } catch (error) {
          console.error(`自動坐下失敗 - 使用者 ${userId}:`, error);
        }
      }
    }
  }

  private async checkAndAutoStop(): Promise<void> {
    const sessions = this.sessionManager.getAllSessions();
    
    for (const [userId, session] of sessions) {
      // Only auto-stop if user has active timer (sitting or standing)
      if (session.status === 'sitting' || session.status === 'standing') {
        try {
          // Delete session (this will clear all timers)
          this.sessionManager.deleteSession(userId);

          // Send notification
          await this.bot.sendMessage(
            session.chatId,
            '🌙 *下班時間到囉！*\n\n系統偵測到現在是下班時間（6:00 PM），已自動停止計時。\n\n今天辛苦了，記得好好休息！\n\n明天上班後使用 /start 重新開始計時。',
            { parse_mode: 'Markdown' }
          );

          console.log(`自動停止已執行 - 使用者: ${userId}`);
        } catch (error) {
          console.error(`自動停止失敗 - 使用者 ${userId}:`, error);
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
      return currentTime >= '09:10' && currentTime < '18:00';
    }
    
    return false;
  }
}