# 使用 Node.js 18 Alpine 作為基礎鏡像
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製原始碼
COPY . .

# 編譯 TypeScript
RUN npm run build

# 暴露端口（如果需要的話）
# EXPOSE 3000

# 創建非 root 用戶
RUN addgroup -g 1001 -S nodejs
RUN adduser -S botuser -u 1001

# 變更檔案擁有者
RUN chown -R botuser:nodejs /app
USER botuser

# 啟動命令
CMD ["npm", "start"]
