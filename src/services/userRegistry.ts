import { readFileSync, writeFileSync, existsSync } from 'fs';

interface RegisteredUser {
  userId: number;
  chatId: number;
  lastSeen: Date;
  autoSitEnabled: boolean;
}

export class UserRegistry {
  private users: Map<number, RegisteredUser> = new Map();
  private envPath: string;

  constructor(envPath: string = '.env') {
    this.envPath = envPath;
    this.loadUsers();
  }

  registerUser(userId: number, chatId: number): void {
    const user: RegisteredUser = {
      userId,
      chatId,
      lastSeen: new Date(),
      autoSitEnabled: true
    };
    this.users.set(userId, user);
    this.saveUsers();
  }

  getUser(userId: number): RegisteredUser | undefined {
    return this.users.get(userId);
  }

  getAllUsers(): RegisteredUser[] {
    return Array.from(this.users.values());
  }

  updateLastSeen(userId: number): void {
    const user = this.users.get(userId);
    if (user) {
      user.lastSeen = new Date();
      this.saveUsers();
    }
  }

  setAutoSitEnabled(userId: number, enabled: boolean): void {
    const user = this.users.get(userId);
    if (user) {
      user.autoSitEnabled = enabled;
      this.saveUsers();
    }
  }

  private loadUsers(): void {
    try {
      if (existsSync(this.envPath)) {
        const envContent = readFileSync(this.envPath, 'utf-8');
        const lines = envContent.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('REGISTERED_USERS=')) {
            const usersData = line.substring('REGISTERED_USERS='.length);
            if (usersData) {
              try {
                const usersArray: RegisteredUser[] = JSON.parse(usersData);
                usersArray.forEach(user => {
                  user.lastSeen = new Date(user.lastSeen);
                  this.users.set(user.userId, user);
                });
                console.log(`載入了 ${this.users.size} 個已註冊用戶`);
              } catch (parseError) {
                console.log('用戶資料格式錯誤，從空白開始');
              }
            }
            break;
          }
        }
      }
    } catch (error) {
      console.error('載入用戶資料失敗:', error);
    }
  }

  private saveUsers(): void {
    try {
      const usersArray = Array.from(this.users.values());
      const usersJson = JSON.stringify(usersArray);
      
      let envContent = '';
      if (existsSync(this.envPath)) {
        envContent = readFileSync(this.envPath, 'utf-8');
      }
      
      const lines = envContent.split('\n');
      let found = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('REGISTERED_USERS=')) {
          lines[i] = `REGISTERED_USERS=${usersJson}`;
          found = true;
          break;
        }
      }
      
      if (!found) {
        lines.push(`REGISTERED_USERS=${usersJson}`);
      }
      
      writeFileSync(this.envPath, lines.join('\n'));
    } catch (error) {
      console.error('儲存用戶資料失敗:', error);
    }
  }
}