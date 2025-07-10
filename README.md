# Telegram 站立提醒機器人

這是一個 Telegram 機器人，專門用於提醒使用者定時站起來活動，避免久坐對健康的影響。

## 功能特色

- ⏰ 自動提醒：設定坐下時間後自動提醒站起來
- 🔄 循環計時：站立後自動開始下一輪計時
- 📊 即時狀態：顯示當前坐下/站立時間
- ⚙️ 自定義設定：可調整坐下和站立的時間長度
- 🔔 持續提醒：未按確認時會持續發送提醒
- 📱 按鈕互動：透過內嵌按鈕輕鬆操作

## 工作流程

1. 使用 `/start` 開始計時（預設坐下 45 分鐘）
2. 時間到時收到站起來的提醒
3. 點擊「站起來」按鈕確認
4. 站立指定時間後（預設 5 分鐘）收到可以坐下的通知
5. 點擊「坐下」按鈕，開始新一輪計時

## 快速開始 (推薦使用 Docker)

### 🐳 使用 Docker 一鍵啟動

我們的 GitHub Action 會自動構建 Docker 鏡像並推送到 GitHub Container Registry。你可以直接拉取並使用：

```bash
# 1. 創建環境變數文件
echo "TELEGRAM_BOT_TOKEN=your_bot_token_here" > .env

# 2. 一鍵拉取並啟動機器人
docker run -d \
  --name tg-standup-bot \
  --env-file .env \
  --restart unless-stopped \
  ghcr.io/123hi123/tg-standup-bot:latest
```

或者使用 docker-compose：

```yaml
# docker-compose.yml
version: '3.8'
services:
  tg-standup-bot:
    image: ghcr.io/123hi123/tg-standup-bot:latest
    container_name: tg-standup-bot
    restart: unless-stopped
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - DEFAULT_SIT_DURATION=45
      - DEFAULT_STAND_DURATION=5
```

然後運行：
```bash
docker-compose up -d
```

### 📦 可用的 Docker 標籤

- `latest` - 最新穩定版本 (main 分支)
- `develop` - 開發版本 (develop 分支)
- `v1.0.0` - 特定版本標籤

## 傳統安裝方式

如果你想從源碼運行：

1. 複製專案
```bash
git clone https://github.com/123hi123/tg-standup-bot.git
cd tg-standup-bot
```

2. 安裝依賴
```bash
npm install
```

3. 設定環境變數
```bash
cp .env.example .env
```

編輯 `.env` 檔案，填入你的 Telegram Bot Token：
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

4. 啟動機器人
```bash
# 開發模式
npm run dev

# 生產模式
npm run build
npm start
```

## 機器人指令

- `/start` - 開始計時
- `/stop` - 停止計時
- `/status` - 查看當前狀態
- `/settings <坐下分鐘> <站立分鐘>` - 調整時間設定
- `/help` - 顯示幫助訊息

## Docker 管理指令

```bash
# 查看容器狀態
docker ps

# 查看日誌
docker logs tg-standup-bot

# 停止機器人
docker stop tg-standup-bot

# 重啟機器人
docker restart tg-standup-bot

# 刪除容器
docker rm tg-standup-bot

# 更新到最新版本
docker pull ghcr.io/123hi123/tg-standup-bot:latest
docker stop tg-standup-bot
docker rm tg-standup-bot
# 然後重新運行上面的 docker run 命令
```

## 專案結構

```
src/
├── bot/           # 機器人主程式
├── handlers/      # 指令和回調處理器
├── services/      # 核心服務（計時器、會話管理）
├── types/         # TypeScript 型別定義
├── config/        # 設定和常數
└── index.ts       # 程式入口
```

## 開發指令

```bash
# 執行開發伺服器
npm run dev

# 建置專案
npm run build

# 程式碼檢查
npm run lint

# 格式化程式碼
npm run format

# 執行測試
npm test
```

## 如何取得 Telegram Bot Token

1. 在 Telegram 中搜尋 @BotFather
2. 發送 `/newbot` 建立新機器人
3. 輸入機器人名稱和使用者名稱
4. 複製產生的 Token 到 `.env` 檔案

## CI/CD 自動化

這個專案使用 GitHub Actions 自動構建和發布 Docker 鏡像：

- 🔄 **自動構建**：每次推送到 `main` 或 `develop` 分支時自動觸發
- 📦 **多架構支援**：支援 `linux/amd64` 和 `linux/arm64` (適用於 Apple Silicon 和 Raspberry Pi)
- 🏷️ **智能標籤**：自動生成版本標籤，包括 `latest`、分支名稱和語義化版本
- 🚀 **即時可用**：構建完成後立即可在 GitHub Container Registry 使用

### GitHub Container Registry

鏡像託管在 GitHub Container Registry：
- 📍 **Registry URL**: `ghcr.io/123hi123/tg-standup-bot`
- 🔐 **訪問權限**: 公開可用，無需認證即可拉取
- 📊 **鏡像大小**: 約 150MB (基於 Alpine Linux)

## 授權

MIT License