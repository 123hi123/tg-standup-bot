import dotenv from 'dotenv';
import { StandUpBot } from './bot/bot';

dotenv.config();

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('錯誤：請在 .env 檔案中設定 TELEGRAM_BOT_TOKEN');
    process.exit(1);
  }

  try {
    const bot = new StandUpBot(token);
    await bot.init();
  } catch (error) {
    console.error('啟動機器人時發生錯誤:', error);
    process.exit(1);
  }
}

main();