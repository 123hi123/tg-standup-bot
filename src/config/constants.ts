export const DEFAULT_SIT_DURATION = parseInt(process.env.DEFAULT_SIT_DURATION || '45');
export const DEFAULT_STAND_DURATION = parseInt(process.env.DEFAULT_STAND_DURATION || '5');

export const REMINDER_INTERVAL_MS = 60 * 1000; // 1 分鐘

export const MESSAGES = {
  WELCOME: '歡迎使用站立提醒機器人！\n\n使用 /start 開始計時\n使用 /settings 調整設定\n使用 /status 查看當前狀態\n使用 /stop 停止計時',
  START_SITTING: '開始計時！你已經坐下了。',
  TIME_TO_STAND: '⏰ 該站起來活動了！你已經坐了 %d 分鐘。',
  STAND_REMINDER: '❗ 請站起來！已經提醒 %d 次了。',
  STANDING: '很好！你正在站立中。',
  TIME_TO_SIT: '✅ 你已經站了 %d 分鐘，可以坐下了。',
  ALREADY_STARTED: '計時已經在進行中了。',
  NOT_STARTED: '還沒有開始計時。使用 /start 開始。',
  STOPPED: '計時已停止。',
  SETTINGS_UPDATED: '設定已更新！\n坐下時間：%d 分鐘\n站立時間：%d 分鐘',
  INVALID_SETTINGS: '設定格式錯誤。請使用：/settings <坐下分鐘數> <站立分鐘數>',
  CURRENT_STATUS: '當前狀態：%s\n已經過時間：%d 分鐘',
  STATUS_SITTING: '坐下中',
  STATUS_STANDING: '站立中',
  STATUS_IDLE: '未開始'
};

export const KEYBOARD_BUTTONS = {
  STAND_UP: '🚶 站起來',
  SIT_DOWN: '💺 坐下',
  STOP: '⏹ 停止計時'
};