# Eclipse MD WhatsApp Bot

## Overview

Eclipse MD is an advanced WhatsApp bot built with Node.js that provides 300+ commands for automation, AI integration, group management, media processing, and entertainment. The bot connects to WhatsApp using the Baileys library (multi-device support) and offers features like AI chat (OpenAI, Gemini, Copilot), image/audio processing, group moderation, games, and various utility commands.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
- **Runtime**: Node.js with ES Modules (`"type": "module"`)
- **WhatsApp Connection**: @whiskeysockets/baileys for multi-device WhatsApp Web API
- **Configuration**: Environment variables via dotenv, with fallback to app.json defaults

### Application Structure
- **Entry Point**: `index.js` - Main bot initialization, WhatsApp socket connection, message handling
- **Command System**: Plugin-based architecture where each command is a separate file in `eclipse-plug/` directory
- **Configuration**: `config.js` loads settings from environment variables, `app.json`, and `settings.js`
- **Data Storage**: JSON files in `data/` directory for persistent storage (settings, user data, game states)

### Command Handler Pattern
Commands follow two patterns:
1. **Standard Export**: Default export with `name`, `description`, `aliases`, and `execute(msg, { sock, args, settings })` function
2. **Horla Wrapper**: Uses `horla()` helper from `lib/horla.js` for consistent command registration with categories and reactions

### Key Directories
- `eclipse-plug/` - All bot commands (AI, group management, media, games, utilities)
- `lib/` - Helper libraries (AI integration, admin checks, settings management)
- `data/` - JSON files for persistent data (banned users, group settings, game scores)

### External Service Integrations
- **AI Services**: OpenAI GPT, Google Gemini, Copilot (via various API endpoints)
- **Media Processing**: FFmpeg for audio effects, Jimp/Sharp for image manipulation
- **Logo Generation**: mumaker library with ephoto360 API
- **File Hosting**: catbox.moe for media uploads

### Group Management Features
- Anti-link detection with configurable actions (warn, delete, kick)
- Anti-spam, anti-tag, anti-mention protections
- Welcome/goodbye messages with customizable templates
- Admin commands (promote, demote, kick, mute)

### Bot Modes
- Public mode: Everyone can use commands
- Private mode: Owner-only access
- Test mode: Load commands without WhatsApp connection (`TEST_MODE_ONLY=true`)

## External Dependencies

### WhatsApp Connection
- **@whiskeysockets/baileys**: Multi-device WhatsApp Web API library
- **Authentication**: File-based auth state storage, optional Mega.nz backup

### AI Services
- **OpenAI API**: GPT models for chat (requires `OPENAI_API_KEY` or settings.js config)
- **Google Generative AI**: Gemini models (requires `GEMINI_API_KEY`)
- **Custom AI endpoints**: Various free AI APIs as fallbacks

### Media Processing
- **FFmpeg**: Audio processing (bass boost, deep voice, speed effects)
- **Sharp/Jimp**: Image manipulation (resize, filters, stickers)
- **wa-sticker-formatter**: WhatsApp sticker creation

### External APIs
- **Football Data API**: Sports scores and standings
- **Dictionary API**: Word definitions
- **Exchange Rate API**: Currency conversion
- **Giphy API**: GIF search
- **Imgur API**: Image hosting

### Database
- **MongoDB/Mongoose**: Optional database connection (configured but JSON files used as primary storage)
- **JSON Files**: Primary data persistence in `data/` directory

### Environment Variables
Required:
- `BOT_NUMBER`: Bot's WhatsApp number
- `BOT_SESSION_DATA`: WhatsApp session ID

Optional:
- `BOT_PREFIX`: Command prefix (default: `.`)
- `BOT_NAME`: Display name
- `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GIPHY_API_KEY`, etc.