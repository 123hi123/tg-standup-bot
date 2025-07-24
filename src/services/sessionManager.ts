import { UserSession, UserSettings } from '../types';
import { DEFAULT_SIT_DURATION, DEFAULT_STAND_DURATION } from '../config/constants';
import { TimerService } from './timerService';

export class SessionManager {
  private sessions: Map<number, UserSession> = new Map();
  private settings: Map<number, UserSettings> = new Map();
  private timerService?: TimerService;

  createSession(userId: number, chatId: number): UserSession {
    const userSettings = this.getUserSettings(userId);
    const session: UserSession = {
      userId,
      chatId,
      status: 'idle',
      sitDurationMinutes: userSettings.sitDurationMinutes,
      standDurationMinutes: userSettings.standDurationMinutes,
    };
    this.sessions.set(userId, session);
    return session;
  }

  getSession(userId: number): UserSession | undefined {
    return this.sessions.get(userId);
  }

  updateSession(userId: number, updates: Partial<UserSession>): UserSession | undefined {
    const session = this.sessions.get(userId);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(userId, updatedSession);
    return updatedSession;
  }

  deleteSession(userId: number): boolean {
    const session = this.sessions.get(userId);
    if (session) {
      if (session.currentTimer) clearTimeout(session.currentTimer);
      if (session.reminderTimer) clearInterval(session.reminderTimer);
    }
    return this.sessions.delete(userId);
  }

  getUserSettings(userId: number): UserSettings {
    let settings = this.settings.get(userId);
    if (!settings) {
      settings = {
        userId,
        sitDurationMinutes: DEFAULT_SIT_DURATION,
        standDurationMinutes: DEFAULT_STAND_DURATION,
      };
      this.settings.set(userId, settings);
    }
    return settings;
  }

  updateUserSettings(userId: number, sitMinutes: number, standMinutes: number): UserSettings {
    const settings: UserSettings = {
      userId,
      sitDurationMinutes: sitMinutes,
      standDurationMinutes: standMinutes,
    };
    this.settings.set(userId, settings);
    
    const session = this.getSession(userId);
    if (session) {
      session.sitDurationMinutes = sitMinutes;
      session.standDurationMinutes = standMinutes;
    }
    
    return settings;
  }

  getElapsedMinutes(session: UserSession): number {
    if (!session.lastActionTime) return 0;
    const now = new Date();
    const elapsed = now.getTime() - session.lastActionTime.getTime();
    return Math.floor(elapsed / (1000 * 60));
  }

  setTimerService(timerService: TimerService): void {
    this.timerService = timerService;
  }

  getAllSessions(): Map<number, UserSession> {
    return this.sessions;
  }

  async startSittingTimer(userId: number): Promise<void> {
    const session = this.getSession(userId);
    if (!session || !this.timerService) return;
    
    this.timerService.startSittingTimer(session);
  }

  async startStandingTimer(userId: number, isManual: boolean = false): Promise<void> {
    const session = this.getSession(userId);
    if (!session || !this.timerService) return;
    
    this.timerService.startStandingTimer(session, isManual);
  }
}