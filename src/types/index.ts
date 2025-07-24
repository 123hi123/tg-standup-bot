export interface UserSession {
  userId: number;
  chatId: number;
  status: 'sitting' | 'standing' | 'idle';
  sitDurationMinutes: number;
  standDurationMinutes: number;
  currentTimer?: NodeJS.Timeout;
  reminderTimer?: NodeJS.Timeout;
  lastMessageId?: number;
  sessionStartTime?: Date;
  lastActionTime?: Date;
  isManualStandup?: boolean;
  autoSitScheduler?: NodeJS.Timeout;
}

export interface UserSettings {
  userId: number;
  sitDurationMinutes: number;
  standDurationMinutes: number;
}

export interface BotCommand {
  command: string;
  description: string;
}