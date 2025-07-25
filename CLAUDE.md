# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Telegram bot built with TypeScript that reminds users to stand up regularly to avoid health issues from prolonged sitting. The bot features automatic scheduling for Taiwan work hours (9:10 AM - 6:00 PM) and uses a timer-based system with interactive inline keyboard buttons.

## Development Commands

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production build
npm start

# Linting and formatting
npm run lint          # ESLint check
npm run format        # Prettier formatting

# Run tests
npm test             # Run Jest tests

# Docker commands
npm run docker:build  # Build Docker image
npm run docker:run    # Run container
npm run docker:stop   # Stop container
npm run docker:logs   # View logs
```

## Key Architecture Components

### Timer System Flow
The bot implements a work-break cycle:
1. **Sitting Phase** (default 45 min) → triggers stand reminder
2. **Standing Phase** (default 5 min) → triggers sit notification
3. **Auto-sit at 9:10 AM** on weekdays if not already sitting
4. **Auto-stop at 6:00 PM** on weekdays to end work sessions

### Core Services Architecture
- **StandUpBot** (`src/bot/bot.ts`): Central coordinator that initializes handlers and manages the AutoSitScheduler
- **SessionManager** (`src/services/sessionManager.ts`): Manages user sessions in memory, handles timer lifecycle
- **TimerService** (`src/services/timerService.ts`): Countdown implementation with reminder notifications
- **AutoSitScheduler** (`src/services/autoSitScheduler.ts`): Cron-based scheduler for automatic work hour management

### Message Flow
1. Commands (e.g., `/start`) → CommandHandler → SessionManager → TimerService
2. Button clicks → CallbackHandler → SessionManager → Bot sends response
3. Timer expiry → TimerService → Bot sends reminder → User confirms → Cycle continues

## Technical Configuration

### TypeScript Setup
- Strict mode enabled with all strict checks
- Target: ES2022, Module: CommonJS
- No unused locals/parameters allowed
- Consistent casing enforced

### Environment Variables
```
TELEGRAM_BOT_TOKEN=required_bot_token
DEFAULT_SIT_DURATION=45  # minutes
DEFAULT_STAND_DURATION=5  # minutes
```

### Time Zone Handling
The bot uses `moment-timezone` for Taiwan time (Asia/Taipei):
- Auto-sit: 9:10 AM on weekdays
- Auto-stop: 6:00 PM on weekdays
- All scheduling respects Taiwan timezone

## Testing Approach

Currently using Jest with ts-jest for unit testing. When writing tests:
- Mock Telegram Bot API responses
- Test timer state transitions
- Verify session management logic
- Check timezone-based scheduling

## Docker Deployment

The project uses GitHub Actions for CI/CD:
- Multi-arch images: `linux/amd64` and `linux/arm64`
- Registry: `ghcr.io/123hi123/tg-standup-bot`
- Auto-builds on push to `main` or `develop` branches