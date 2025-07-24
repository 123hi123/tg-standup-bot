# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Telegram bot built with TypeScript that reminds users to stand up regularly to avoid health issues from prolonged sitting. The bot uses a timer-based system with interactive inline keyboard buttons.

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

# Linting
npm run lint

# Format code
npm run format

# Run tests
npm test

# Docker commands
npm run docker:build  # Build Docker image
npm run docker:run    # Run container
npm run docker:stop   # Stop container
npm run docker:logs   # View logs
```

## Architecture

The codebase follows a modular TypeScript architecture:

- **Entry Point**: `src/index.ts` - Initializes bot with environment configuration
- **Bot Core**: `src/bot/bot.ts` - Main `StandUpBot` class that coordinates all bot functionality
- **Handlers**: 
  - `src/handlers/commandHandler.ts` - Processes Telegram commands (/start, /stop, etc.)
  - `src/handlers/callbackHandler.ts` - Handles inline keyboard button interactions
- **Services**:
  - `src/services/sessionManager.ts` - Manages user session state and timers
  - `src/services/timerService.ts` - Handles countdown timers and notifications
- **Configuration**: `src/config/constants.ts` - Default durations and constants
- **Types**: `src/types/index.ts` - TypeScript interfaces and type definitions

## Key Dependencies

- `node-telegram-bot-api` - Telegram Bot API wrapper
- `node-cron` - For scheduling tasks
- `dotenv` - Environment variable management
- TypeScript with strict mode enabled

## Environment Setup

Requires a `.env` file with:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
DEFAULT_SIT_DURATION=45  # Optional: minutes
DEFAULT_STAND_DURATION=5  # Optional: minutes
```

## Testing Strategy

The project uses Jest with ts-jest for testing. Run tests with `npm test`.

## Docker Deployment

The project is containerized and automatically published to GitHub Container Registry:
- Image: `ghcr.io/123hi123/tg-standup-bot:latest`
- Multi-architecture support (amd64, arm64)
- Automated CI/CD via GitHub Actions