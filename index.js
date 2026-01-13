import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from '@whiskeysockets/baileys';

import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import axios from 'axios'; // Import axios for dictionary command
import archiver from 'archiver';
import { loadSettings, saveSettings, updateSetting, getCurrentSettings } from './lib/persistentData.js';
import { handleLinkDetection } from './eclipse-plug/antilink.js';
import isAdmin from './lib/isAdmin.js';
import { buttonResponses } from './lib/menuButtons.js';
import { storeMessage, handleMessageRevocation } from './eclipse-plug/self/antidelete.js';
import { readState as readAnticallState } from './eclipse-plug/self/anticall.js';
import { checkAutoGreetings } from './eclipse-plug/self/autogreet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// STARTUP GUARD: Prevent WhatsApp connection during testing/fixes
// Set TEST_MODE_ONLY=true in environment to load commands without connecting
const TEST_MODE = process.env.TEST_MODE_ONLY === 'true';
if (TEST_MODE) {
  console.log('\n' + '='.repeat(60));
  console.log('🛑 TEST MODE ACTIVATED - Bot will load commands but NOT connect to WhatsApp');
  console.log('='.repeat(60) + '\n');
  
  console.log('✅ Loading bot configuration...');
}

// Import config to get the prefix
import config from './config.js';
const COMMAND_PREFIX = process.env.BOT_PREFIX || config.prefix;

// Make config globally accessible
global.config = {
  botName: config.botName,
  prefix: COMMAND_PREFIX,
  ownerNumber: config.ownerNumber,
  ownerName: config.ownerName
};
global.COMMAND_PREFIX = COMMAND_PREFIX;

const MODS_FILE = path.join(__dirname, 'data', 'moderators.json');
const BANNED_FILE = path.join(__dirname, 'data', 'banned.json');
const WELCOME_CONFIG_FILE = path.join(__dirname, 'data', 'welcomeConfig.json');
const SESSION_ID_FILE = path.join(__dirname, 'SESSION-ID');
const ANTIDELETE_MESSAGES_FILE = path.join(__dirname, 'data', 'antidelete_messages.json');

// Clear antidelete messages on bot restart
function clearAntideleteMessages() {
  try {
    if (fs.existsSync(ANTIDELETE_MESSAGES_FILE)) {
      fs.writeFileSync(ANTIDELETE_MESSAGES_FILE, JSON.stringify({}, null, 2));
      console.log('[ANTIDELETE] Cleared stored messages on restart');
    }
  } catch (err) {
    console.error('[ANTIDELETE] Error clearing messages:', err);
  }
}

// Clear antidelete messages immediately on startup
clearAntideleteMessages();

let botActive = true;

// Load persistent settings on startup
const persistentSettings = loadSettings();
let botMode = persistentSettings.botMode || 'public'; // 'public' or 'self'
global.botMode = botMode; // Make it globally accessible

// Helper function to parse boolean environment variables
const parseBoolEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
};

// Initialize automation globals from environment variables (priority) or persistent settings (fallback)
global.autoViewMessage = parseBoolEnv('AUTO_VIEW_MESSAGE', persistentSettings.autoViewMessage || false);
global.autoViewStatus = parseBoolEnv('AUTO_VIEW_STATUS', persistentSettings.autoViewStatus || false);
global.autoReactStatus = parseBoolEnv('AUTO_REACT_STATUS', persistentSettings.autoReactStatus || false);
global.autoReact = parseBoolEnv('AUTO_REACT', persistentSettings.autoReact || false);
global.autoStatusEmoji = process.env.AUTO_STATUS_EMOJI || persistentSettings.autoStatusEmoji || '❤️';
global.autoTyping = parseBoolEnv('AUTO_TYPING', persistentSettings.autoTyping || false);
global.autoRecording = parseBoolEnv('AUTO_RECORDING', persistentSettings.autoRecording || false);

// Initialize anti-detection globals from persistent settings
global.antiLinkWarn = persistentSettings.antiLinkWarn || {};
global.antiLinkKick = persistentSettings.antiLinkKick || {};
global.antiBadWord = persistentSettings.antiBadWord || {};


let processedMessages = new Set();

// Antibug/Anti-spam system - Store message timestamps for each user
const messageCount = {};
const TIME_LIMIT = 1 * 1000; // 1 second in milliseconds
const MESSAGE_LIMIT = 2; // Maximum 2 messages per second

// Load antibug settings
function loadAntibugSettings() {
  const ANTIBUG_FILE = path.join(__dirname, 'data', 'antibug_settings.json');
  if (!fs.existsSync(ANTIBUG_FILE)) {
    return { enabled: false };
  }
  try {
    return JSON.parse(fs.readFileSync(ANTIBUG_FILE, 'utf-8'));
  } catch {
    return { enabled: false };
  }
}

let moderators = fs.existsSync(MODS_FILE)
  ? JSON.parse(fs.readFileSync(MODS_FILE))
  : [];

// Auto-greet scheduler reference
let autoGreetInterval = null;

function saveModerators() {
  fs.writeFileSync(MODS_FILE, JSON.stringify(moderators, null, 2));
}

function loadBanned() {
  return fs.existsSync(BANNED_FILE)
    ? JSON.parse(fs.readFileSync(BANNED_FILE))
    : {};
}

let welcomeConfig = fs.existsSync(WELCOME_CONFIG_FILE)
  ? JSON.parse(fs.readFileSync(WELCOME_CONFIG_FILE))
  : {};

function saveWelcomeConfig() {
  fs.writeFileSync(WELCOME_CONFIG_FILE, JSON.stringify(welcomeConfig, null, 2));
}



// Setup auth state using local file storage
async function setupAuthState() {
  const authDir = './auth_info';

  // Create auth directory if it doesn't exist
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log(color('[AUTH] Created auth directory: ./auth_info', 'cyan'));
  }

  // Import config to get session data with proper fallback
  const configModule = await import('./config.js');
  let sessionData = process.env.DYNAMIC_SESSION || process.env.BOT_SESSION_DATA || configModule.default.sessionData;

  // Helper function to detect and auto-convert session format
  const detectAndNormalizeSession = (data) => {
    if (!data) return null;
    
    // Try base64 decode first (most common format)
    try {
      const decoded = Buffer.from(data, 'base64').toString('utf-8');
      JSON.parse(decoded);
      console.log(color('[AUTH] ✅ Base64 session detected and validated', 'green'));
      return data; // Return original base64 for processing
    } catch (e) {
      // Fallback: try as raw JSON
      try {
        JSON.parse(data);
        console.log(color('[AUTH] ✅ Raw JSON session detected', 'green'));
        return Buffer.from(data, 'utf-8').toString('base64'); // Convert to base64
      } catch (e2) {
        console.log(color('[WARN] Invalid session format - check your SESSION-ID', 'yellow'));
        return null;
      }
    }
  };

  if (!sessionData) {
    const instanceSessionFile = process.env.BOT_SESSION_FILE || SESSION_ID_FILE;

    if (!fs.existsSync(instanceSessionFile)) {
      console.log(color('[ERROR] SESSION-ID file not found and no dynamic session provided!', 'red'));
      console.log(color('[INFO] Please provide your session ID to continue:', 'yellow'));

      // Import readline for user input
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      sessionData = await new Promise((resolve) => {
        rl.question('Enter your SESSION-ID: ', (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });

      if (!sessionData) {
        console.log(color('[ERROR] No session ID provided!', 'red'));
        process.exit(1);
      }

      sessionData = detectAndNormalizeSession(sessionData);

      // Save the provided session ID to file for future use
      try {
        fs.writeFileSync(instanceSessionFile, sessionData);
        console.log(color('[SUCCESS] Session ID saved to file for future use.', 'green'));
      } catch (error) {
        console.log(color('[WARN] Could not save session ID to file:', 'yellow'), error.message);
      }
    } else {
      sessionData = fs.readFileSync(instanceSessionFile, 'utf8').trim();
      sessionData = detectAndNormalizeSession(sessionData);
      
      if (!sessionData) {
        console.log(color('[ERROR] SESSION-ID file exists but is empty!', 'red'));
        console.log(color('[INFO] Please provide your session ID to continue:', 'yellow'));

        // Import readline for user input
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        sessionData = await new Promise((resolve) => {
          rl.question('Enter your SESSION-ID: ', (answer) => {
            rl.close();
            resolve(answer.trim());
          });
        });

        if (!sessionData) {
          console.log(color('[ERROR] No session ID provided!', 'red'));
          process.exit(1);
        }

        sessionData = detectAndNormalizeSession(sessionData);

        // Update the file with the provided session ID
        try {
          fs.writeFileSync(instanceSessionFile, sessionData);
          console.log(color('[SUCCESS] Session ID saved to file.', 'green'));
        } catch (error) {
          console.log(color('[WARN] Could not save session ID to file:', 'yellow'), error.message);
        }
      }
    }
  } else {
    sessionData = detectAndNormalizeSession(sessionData);
  }

  try {
    console.log(color('[INFO] Setting up auth state', 'cyan'));

    // Initialize creds.json if it doesn't exist and we have session data
    const credsPath = path.join(authDir, 'creds.json');
    if (!fs.existsSync(credsPath) && sessionData) {
      try {
        const decoded = Buffer.from(sessionData, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        fs.writeFileSync(credsPath, JSON.stringify(parsed, null, 2));
        console.log(color('[AUTH] ✅ Wrote session credentials to creds.json', 'green'));
        console.log(color(`[AUTH] WhatsApp account: ${parsed.me?.id?.split('@')[0] || 'Connected'}`, 'cyan'));
      } catch (err) {
        console.log(color('[AUTH] ⚠️  Could not parse session (will try existing auth):', 'yellow'), err.message.substring(0, 50));
      }
    }

    // Use Baileys' built-in auth state management with fixed directory
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    console.log(color('[AUTH] ✅ Auth state loaded from ./auth_info', 'green'));

    return { state, saveCreds };
  } catch (err) {
    console.log(color(`[ERROR] Auth state setup failed: ${err.message}`, 'red'));
    console.log(color('[INFO] Ensure your SESSION-ID contains valid base64-encoded JSON.', 'yellow'));
    process.exit(1);
  }
}

// Normalize JID to phone number (handles @lid JIDs)
async function normalizeJid(sock, jid, groupId) {
  if (!jid.includes('@lid')) return jid.split('@')[0];
  try {
    const groupMetadata = groupId ? await sock.groupMetadata(groupId) : null;
    const participant = groupMetadata?.participants.find(p => p.id === jid);
    return participant?.id.split('@')[0] || jid.split('@')[0];
  } catch {
    return jid.split('@')[0];
  }
}

// Color function for designed logs
const color = (text, colorCode) => {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m', // For debug logs
    reset: '\x1b[0m'
  };
  return colors[colorCode] ? colors[colorCode] + text + colors.reset : text;
};

// Load commands dynamically - make global for menu access
global.commands = new Map();
global.selfCommands = new Map();
const commands = global.commands;
const selfCommands = global.selfCommands;

// Import chatbot handler
let chatbotHandler = null;
try {
  const chatbotModule = await import('./eclipse-plug/chatbot.js');
  chatbotHandler = chatbotModule.handleChatbotResponse;
  console.log(color('[INFO] Chatbot handler loaded successfully', 'green'));
} catch (err) {
  console.log(color('[WARN] Chatbot handler not available', 'yellow'));
}

// Load public commands
const commandsDir = path.join(__dirname, 'eclipse-plug');
const commandFiles = fs
  .readdirSync(commandsDir)
  .filter((f) => f.endsWith('.js') || f.endsWith('.cjs'));

for (const file of commandFiles) {
  try {
    let imported;
    const filePath = path.join(commandsDir, file);

    imported = await import(`file://${filePath}`);

    const exportedCommands = imported.default;

    // Function to load a single command with aliases
    const loadSingleCommand = (command, source = '') => {
      let commandName, commandObj;

      // Handle different command structures
      if (command.name && typeof command.execute === 'function') {
        commandName = command.name;
        commandObj = command;
      } else if (command.nomCom && typeof command.execute === 'function') {
        // Convert horla command structure to standard structure
        commandName = command.nomCom;
        commandObj = {
          name: command.nomCom,
          description: command.description || `${command.nomCom} command`,
          category: command.categorie || 'Other',
          aliases: command.aliases || [],
          execute: async (msg, options) => {
            // Adapt horla structure to standard structure
            const { sock, args, settings } = options;
            const dest = msg.key.remoteJid;
            const commandeOptions = {
              arg: args,
              ms: msg,
              msgReponse: msg,
              // Add other horla-specific options as needed
            };
            return await command.execute(dest, sock, commandeOptions);
          }
        };
      } else {
        console.log(color(`[WARN] Invalid command structure in ${source}`, 'yellow'));
        return false;
      }

      // Load main command
      commands.set(commandName, commandObj);

      // Load aliases if they exist
      if (commandObj.aliases && Array.isArray(commandObj.aliases)) {
        for (const alias of commandObj.aliases) {
          commands.set(alias, commandObj);
        }
      }

      return true;
    };

    // Handle single command export (default export)
    if (exportedCommands && (exportedCommands.name || exportedCommands.nomCom) && typeof exportedCommands.execute === 'function') {
      loadSingleCommand(exportedCommands);
    }
    // Handle array of commands export (like logo.js default export)
    else if (Array.isArray(exportedCommands)) {
      for (const command of exportedCommands) {
        loadSingleCommand(command, ` from array`);
      }
    }

    // Always check for named exports (commands exported individually)
    for (const [key, value] of Object.entries(imported)) {
      if (key !== 'default' && value) {
        // Handle single named export
        if ((value.name || value.nomCom) && typeof value.execute === 'function') {
          loadSingleCommand(value, ` (named export: ${key})`);
        }
        // Handle array in named export
        else if (Array.isArray(value)) {
          for (const command of value) {
            if (command && (command.name || command.nomCom) && typeof command.execute === 'function') {
              loadSingleCommand(command, ` from ${key} array`);
            }
          }
        }
        // Handle object containing multiple commands
        else if (typeof value === 'object' && value !== null) {
          for (const [subKey, subValue] of Object.entries(value)) {
            if (subValue && (subValue.name || subValue.nomCom) && typeof subValue.execute === 'function') {
              loadSingleCommand(subValue, ` from ${key}.${subKey}`);
            }
          }
        }
      }
    }
  } catch (err) {
    // Skip files that can't be imported (likely due to syntax errors or missing dependencies)
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.message.includes('Cannot resolve')) {
      console.log(color(`[INFO] Skipping ${file} due to missing dependencies: ${err.message}`, 'yellow'));
    } else if (err.name === 'SyntaxError') {
      console.log(color(`[WARN] Syntax error in ${file}: ${err.message}`, 'orange'));
    } else {
      console.log(color(`[ERROR] Failed to load command ${file}: ${err.message}`, 'red'));
    }

    // Log the full error for debugging
    console.log(color(`[DEBUG] Full error for ${file}:`, 'gray'), err);
  }
}

// Load self commands
const selfCommandsDir = path.join(__dirname, 'eclipse-plug', 'self');
if (fs.existsSync(selfCommandsDir)) {
  const selfCommandFiles = fs
    .readdirSync(selfCommandsDir)
    .filter((f) => f.endsWith('.js') || f.endsWith('.cjs'));

  for (const file of selfCommandFiles) {
    try {
      let imported;
      const filePath = path.join(selfCommandsDir, file);

      imported = await import(`file://${filePath}`);

      // Function to load a single self command with aliases
      const loadSelfCommand = (command, source = '') => {
        let commandName, commandObj;

        // Handle different command structures
        if (command.name && typeof command.execute === 'function') {
          commandName = command.name;
          commandObj = command;
        } else if (command.nomCom && typeof command.execute === 'function') {
          // Convert horla command structure to standard structure
          commandName = command.nomCom;
          commandObj = {
            name: command.nomCom,
            description: command.description || `${command.nomCom} command`,
            category: command.categorie || 'Self',
            aliases: command.aliases || [],
            execute: async (msg, options) => {
              // Adapt horla structure to standard structure
              const { sock, args, settings } = options;
              const dest = msg.key.remoteJid;
              const commandeOptions = {
                arg: args,
                ms: msg,
                msgReponse: msg,
                // Add other horla-specific options as needed
              };
              return await command.execute(dest, sock, commandeOptions);
            }
          };
        } else {
          console.log(color(`[WARN] Invalid self command structure in ${source}`, 'yellow'));
          return false;
        }

        // Load main command
        selfCommands.set(commandName, commandObj);

        // Load aliases if they exist
        if (commandObj.aliases && Array.isArray(commandObj.aliases)) {
          for (const alias of commandObj.aliases) {
            selfCommands.set(alias, commandObj);
          }
        }

        return true;
      };

      // Handle default export
      if (imported.default && (imported.default.name || imported.default.nomCom) && typeof imported.default.execute === 'function') {
        loadSelfCommand(imported.default);
      }
      // Handle array in default export
      else if (Array.isArray(imported.default)) {
        for (const command of imported.default) {
          loadSelfCommand(command, ` from array`);
        }
      }

      // Always check for named exports
      for (const [key, value] of Object.entries(imported)) {
        if (key !== 'default' && value) {
          // Handle single named export
          if ((value.name || value.nomCom) && typeof value.execute === 'function') {
            loadSelfCommand(value, ` (named export: ${key})`);
          }
          // Handle array in named export
          else if (Array.isArray(value)) {
            for (const command of value) {
              if (command && (command.name || command.nomCom) && typeof command.execute === 'function') {
                loadSelfCommand(command, ` from ${key} array`);
              }
            }
          }
          // Handle object containing multiple commands
          else if (typeof value === 'object' && value !== null) {
            for (const [subKey, subValue] of Object.entries(value)) {
              if (subValue && (subValue.name || subValue.nomCom) && typeof subValue.execute === 'function') {
                loadSelfCommand(subValue, ` from ${key}.${subKey}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.log(color(`[ERROR] Failed to load self command ${file}: ${err.message}`, 'red'));
    }
  }
}

// Add the dictionary command
const dictionaryCommand = {
  name: 'dictionary',
  description: 'Get meaning of a word',
  aliases: ['dict', 'define', 'meaning'],
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;

    if (!args[0]) {
      return await sock.sendMessage(from, {
        text: `*Enter the word to search*\n\nExample: ${settings.prefix}dict hello`
      }, { quoted: msg });
    }

    try {
      const word = args[0].toLowerCase();
      const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const dice = response.data[0];

      console.log('Dictionary lookup for:', dice.word);

      const phonetic = dice.phonetic || dice.phonetics?.[0]?.text || 'N/A';
      const definition = dice.meanings[0].definitions[0].definition;
      const example = dice.meanings[0].definitions[0].example || 'No example available';
      const partOfSpeech = dice.meanings[0].partOfSpeech || 'N/A';

      await sock.sendMessage(from, {
        text: `📖 *Dictionary*\n\n*Word*: ${dice.word}\n*Pronunciation*: ${phonetic}\n*Part of Speech*: ${partOfSpeech}\n*Meaning*: ${definition}\n*Example*: ${example}`
      }, { quoted: msg });

    } catch (err) {
      console.log('Dictionary error:', err.message);

      if (err.response && err.response.status === 404) {
        return await sock.sendMessage(from, {
          text: `❌ Word "${args[0]}" not found in dictionary. Please check spelling and try again.`
        }, { quoted: msg });
      }

      return await sock.sendMessage(from, {
        text: `❌ Error looking up word: ${err.message}`
      }, { quoted: msg });
    }
  }
};
commands.set('dictionary', dictionaryCommand);
// Add dictionary aliases
commands.set('dict', dictionaryCommand);
commands.set('define', dictionaryCommand);
commands.set('meaning', dictionaryCommand);

// Count unique commands
const uniqueCommands = new Map();
for (const [name, cmd] of commands.entries()) {
  if (!uniqueCommands.has(cmd.name || cmd.nomCom)) {
    uniqueCommands.set(cmd.name || cmd.nomCom, cmd);
  }
}

const uniqueSelfCommands = new Map();
for (const [name, cmd] of selfCommands.entries()) {
  if (!uniqueSelfCommands.has(cmd.name || cmd.nomCom)) {
    uniqueSelfCommands.set(cmd.name || cmd.nomCom, cmd);
  }
}

// Display loaded commands in test mode
if (TEST_MODE) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 LOADED PUBLIC COMMANDS:');
  console.log('='.repeat(60));
  
  uniqueCommands.forEach((cmd, name) => {
    const aliases = cmd.aliases ? ` (aliases: ${cmd.aliases.join(', ')})` : '';
    console.log(`  ✓ ${name}${aliases}`);
  });
  
  console.log(`\nTotal: ${uniqueCommands.size} commands`);
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 LOADED SELF COMMANDS:');
  console.log('='.repeat(60));
  
  uniqueSelfCommands.forEach((cmd, name) => {
    const aliases = cmd.aliases ? ` (aliases: ${cmd.aliases.join(', ')})` : '';
    console.log(`  ✓ ${name}${aliases}`);
  });
  
  console.log(`\nTotal: ${uniqueSelfCommands.size} commands`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All systems ready (WhatsApp connection SKIPPED)');
  console.log('\n💡 To connect to WhatsApp, remove TEST_MODE_ONLY environment variable');
  console.log('\n' + '='.repeat(60));
  process.exit(0);
}

async function startBot() {
  try {
    const { state, saveCreds } = await setupAuthState();

    let version;
    try {
      const { version: waVersion, isLatest } = await fetchLatestBaileysVersion();
      version = waVersion;
      console.log(color(`[INFO] Using WA v${version.join('.')}, isLatest: ${isLatest}`, 'cyan'));
    } catch (err) {
      version = [2, 3000, 1014670938];
      console.log(color(`[INFO] Using fallback version: ${version.join('.')}`, 'yellow'));
    }

    console.log(color('[INFO] Initializing WhatsApp connection...', 'blue'));

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['Ubuntu', 'Chrome', '110.0.0'],
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      defaultQueryTimeoutMs: 60000,
      retryRequestDelayMs: 1000,
      maxMsgRetryCount: 2,
      markOnlineOnConnect: false,
    });



    // Wrapper for sendMessage to log sent messages in a designed way
    const originalSendMessage = sock.sendMessage.bind(sock);
    sock.sendMessage = (jid, content, options = {}) => {
      if (content.text) {
        console.log(color(`[SENT] To ${jid}: ${content.text}`, 'magenta'));
      } else if (content.image) {
        console.log(color(`[SENT] To ${jid}: Image message`, 'magenta'));
      } else {
        console.log(color(`[SENT] To ${jid}: Media/Other message`, 'magenta'));
      }
      return originalSendMessage(jid, content, options);
    };

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.output?.payload?.error || 'Unknown';
        console.log(color(`\n❌ Connection closed: ${reason} (Code: ${code || 'unknown'})`, 'red'));

        if (code === DisconnectReason.loggedOut) {
          console.log(color('[ERROR] Device logged out. Session expired!', 'red'));
          console.log(color('[INFO] Please generate a new SESSION-ID and update the file.', 'yellow'));
          process.exit(1);
        } else if (code === DisconnectReason.restartRequired) {
          console.log(color('[INFO] Restart required. Restarting...', 'yellow'));
          setTimeout(startBot, 3000);
        } else if (code === 401) {
          console.log(color('[ERROR] Unauthorized. Session is invalid!', 'red'));
          console.log(color('[INFO] Please generate a new SESSION-ID and update the file.', 'yellow'));
          process.exit(1);
        } else if (code === 408) {
          console.log(color('[ERROR] Connection timeout. This usually means:', 'red'));
          console.log(color('  1. Session has expired - Generate new SESSION-ID', 'yellow'));
          console.log(color('  2. Network connectivity issues', 'yellow'));
          console.log(color('  3. WhatsApp servers are temporarily unavailable', 'yellow'));
          console.log(color('[INFO] Retrying in 30 seconds...', 'blue'));
          setTimeout(startBot, 30000);
        } else if (code === DisconnectReason.badSession) {
          console.log(color('[ERROR] Bad session. Please generate a new SESSION-ID.', 'red'));
          // Silently exit without showing session prompts
          process.exit(1);
        } else if (code !== DisconnectReason.connectionLost) {
          console.log(color('[INFO] Attempting to reconnect in 20 seconds...', 'yellow'));
          setTimeout(startBot, 20000);
        }
      } else if (connection === 'connecting') {
        console.log(color('[INFO] Connecting to WhatsApp...', 'blue'));
      } else if (connection === 'open') {
        console.log(color('\n🎉 PUBLIC BOT IS NOW ONLINE!', 'green'));
        console.log('═'.repeat(50));
        console.log(color(`📱 Connected as: ${sock.user?.name || 'Bot'}`, 'cyan'));
        console.log(color(`📞 Number: ${sock.user?.id?.split(':')[0] || 'Unknown'}`, 'cyan'));
        console.log(color(`🚀 Command prefix: ${COMMAND_PREFIX}`, 'cyan'));
        console.log(color(`🤖 Mode: ${botMode.toUpperCase()}`, 'cyan'));
        console.log(color(`📋 Commands loaded: ${commands.size} public, ${selfCommands.size} self`, 'cyan'));
        console.log('═'.repeat(50));
        processedMessages.clear();

        // Send connection message to owner with profile picture
        try {
          const { mediaUrls } = await import('./lib/mediaUrls.js');
          const config = await import('./config.js');

          // Use owner number from config.js
          const ownerNumbers = [config.default.ownerNumber];
          const botPrefix = config.default.prefix || COMMAND_PREFIX;
          const botName = config.default.botName || '𝔼𝕔𝕝𝕚𝕡𝕤𝕖 𝕄𝔻';
          const ownerName = config.default.ownerName || 'Bot Owner';

          // Send connection success message
          const welcomeMessage = `🎉 *${botName} Connected Successfully!* 🎉

┌─────「 🤖 BOT INFORMATION 」─────┐
│ 📱 Bot Name: ${botName}
│ 👑 Owner: ${ownerName}
│ 🔧 Prefix: ${botPrefix}
│ 📅 Connected: ${new Date().toLocaleString()}
│ 🌐 Mode: ${botMode.toUpperCase()}
└─────────────────────────────────┘

📋 *HOW TO USE:*
Type ${botPrefix}menu to see all commands

*Bot is now ready to serve!*

© ${ownerName}`;

          // Send to owner numbers
          for (const ownerNum of ownerNumbers) {
            try {
              await sock.sendMessage(`${ownerNum}@s.whatsapp.net`, {
                image: { url: mediaUrls.menuImage },
                caption: welcomeMessage
              });
              console.log(`[CONNECTION] Welcome message sent to owner: ${ownerNum}`);
            } catch (error) {
              console.error(`[ERROR] Failed to send welcome message to ${ownerNum}:`, error);
            }
          }
        } catch (error) {
          console.log(color('[WARN] Failed to send connection message:', 'yellow'), error.message);
        }

        // Clear previous auto-greet interval if exists (prevent duplicates on reconnect)
        if (autoGreetInterval) {
          clearInterval(autoGreetInterval);
          console.log(color('[AUTOGREET] Cleared previous scheduler', 'yellow'));
        }

        // Start auto-greet checker (checks every minute)
        autoGreetInterval = setInterval(async () => {
          try {
            await checkAutoGreetings(sock);
          } catch (err) {
            console.log(color('[AUTOGREET] Check failed:', 'yellow'), err.message);
          }
        }, 60000); // Check every 60 seconds
        console.log(color('[AUTOGREET] Auto-greeting scheduler started', 'green'));

        // Auto-follow newsletter channel on startup with retry logic
        setTimeout(async () => {
          try {
            const { NEWSLETTER_JID } = await import('./lib/channelConfig.js');
            console.log(color('[NEWSLETTER] Attempting to follow channel: ' + NEWSLETTER_JID, 'cyan'));
            
            // Retry logic - try up to 3 times with delays
            let retries = 3;
            let followed = false;
            
            while (retries > 0 && !followed) {
              try {
                await sock.newsletterFollow(NEWSLETTER_JID);
                console.log(color('[NEWSLETTER] Successfully followed channel!', 'green'));
                followed = true;
              } catch (err) {
                // Check if already following
                if (err.message && (err.message.includes('already') || err.message.includes('ALREADY_FOLLOWING'))) {
                  console.log(color('[NEWSLETTER] Channel already followed!', 'green'));
                  followed = true;
                  break;
                }
                
                retries--;
                if (retries > 0) {
                  console.log(color(`[NEWSLETTER] Follow attempt failed, retrying... (${retries} attempts left)`, 'yellow'));
                  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
                } else {
                  throw err;
                }
              }
            }
          } catch (newsletterErr) {
            console.log(color('[NEWSLETTER] Could not follow channel: ' + newsletterErr.message, 'yellow'));
            console.log(color('[NEWSLETTER] You may need to manually join the channel or it may already be followed', 'yellow'));
          }
        }, 10000); // Wait 10 seconds after connection before attempting to follow
      }
    });

    // Handle incoming calls (anticall feature)
    sock.ev.on('call', async (callData) => {
      try {
        const anticallState = readAnticallState();
        if (!anticallState.enabled) return;

        for (const call of callData) {
          if (call.status === 'offer') {
            console.log(color('[ANTICALL] Incoming call detected, rejecting and blocking...', 'yellow'));
            
            try {
              await sock.rejectCall(call.id, call.from);
              console.log(color('[ANTICALL] Call rejected', 'green'));
              
              await sock.updateBlockStatus(call.from, 'block');
              console.log(color(`[ANTICALL] Blocked caller: ${call.from}`, 'green'));
              
              const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
              await sock.sendMessage(ownerNumber, {
                text: `📵 *ANTICALL ALERT*\n\n🚫 Rejected and blocked incoming call from:\n📱 *${call.from}*\n\n⏰ Time: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}`
              });
            } catch (err) {
              console.log(color(`[ANTICALL] Error handling call: ${err.message}`, 'red'));
            }
          }
        }
      } catch (err) {
        console.log(color(`[ANTICALL] Call event error: ${err.message}`, 'red'));
      }
    });

    // Handle status updates for automation
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      // Handle status messages
      if (type === 'notify') {
        for (const msg of messages) {
          if (msg.key && msg.key.remoteJid === 'status@broadcast') {
            try {
              console.log(color('[STATUS] Status update detected', 'cyan'));

              if (global.autoViewStatus) {
                await sock.readMessages([msg.key]);
                console.log(color('[STATUS] Auto viewed status', 'green'));
              }

              if (global.autoReactStatus) {
                const emoji = global.autoStatusEmoji || '❤️';
                await sock.sendMessage(msg.key.remoteJid, {
                  react: {
                    text: emoji,
                    key: msg.key
                  }
                });
                console.log(color(`[STATUS] Auto reacted to status with ${emoji}`, 'green'));
              }

              if (global.autoStatusEmoji && !global.autoReactStatus) {
                const emoji = global.autoStatusEmoji;
                await sock.sendMessage(msg.key.remoteJid, {
                  react: {
                    text: emoji,
                    key: msg.key
                  }
                });
                console.log(color(`[STATUS] Auto reacted to status with emoji ${emoji}`, 'green'));
              }
            } catch (e) {
              console.log(color(`[WARN] Status automation failed: ${e.message}`, 'yellow'));
            }
          }
        }
      }
    });

    sock.ev.on('group-participants.update', async (update) => {
      try {
        const groupId = update.id;
        if (!welcomeConfig[groupId]?.enabled) return;

        // Get group metadata for proper message formatting
        const groupMeta = await sock.groupMetadata(groupId);

        for (const participant of update.participants) {
          try {
            const contactId = await normalizeJid(sock, participant, groupId);
            let text = '';

            if (update.action === 'add') {
              // Use proper welcome message with all placeholders
              const welcomeMsg = welcomeConfig[groupId].welcomeMessage || '🎉 Welcome @user to *@group*!\n\n📝 *Group Description:*\n@desc\n\n👥 You are member #@count';
              text = welcomeMsg
                .replace(/@user/g, `@${contactId}`)
                .replace(/@group/g, groupMeta.subject || 'this group')
                .replace(/@desc/g, groupMeta.desc || 'No description available')
                .replace(/@count/g, groupMeta.participants.length.toString());
            } else if (update.action === 'remove') {
              // Use proper goodbye message with all placeholders  
              const goodbyeMsg = welcomeConfig[groupId].goodbyeMessage || '👋 @user left *@group*\n\n😢 We will miss you!\n\n👥 Now we have @count members';
              text = goodbyeMsg
                .replace(/@user/g, `@${contactId}`)
                .replace(/@group/g, groupMeta.subject || 'this group')
                .replace(/@desc/g, groupMeta.desc || 'No description available')
                .replace(/@count/g, (groupMeta.participants.length - 1).toString()); // -1 for the person who left
            }

            if (text) {
              await sock.sendMessage(groupId, { text, mentions: [participant] });
              console.log(`[WELCOME] Sent ${update.action === 'add' ? 'welcome' : 'goodbye'} message to ${groupId}`);
            }
          } catch (err) {
            console.log(`[WARN] Failed to process participant ${participant}: ${err.message}`);
          }
        }
      } catch (err) {
        console.log(`[WARN] Group update error: ${err.message}`);
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        try {
          if (!msg.message) continue;

          const isFromMe = msg.key.fromMe;
          // Allow bot to process its own messages too

          const messageId = msg.key.id;
          if (processedMessages.has(messageId)) return;
          processedMessages.add(messageId);
          setTimeout(() => processedMessages.delete(messageId), 60000);

          // Antibug/Anti-spam detection (only for non-owner messages)
          if (!isFromMe) {
            const senderJid = msg.key.participant || msg.key.remoteJid;
            const userId = senderJid;

            // Initialize user in messageCount if they don't exist
            if (!messageCount[userId]) {
              messageCount[userId] = [];
            }

            // Get current timestamp
            const now = Date.now();

            // Add the current message timestamp to the user's message array
            messageCount[userId].push(now);

            // Remove timestamps that are older than the TIME_LIMIT
            messageCount[userId] = messageCount[userId].filter(timestamp => now - timestamp <= TIME_LIMIT);

            // Check if the number of messages in the last TIME_LIMIT exceeds the MESSAGE_LIMIT
            if (messageCount[userId].length > MESSAGE_LIMIT) {
              const antibugSettings = loadAntibugSettings();

              if (antibugSettings.enabled) {
                console.log(color(`[ANTIBUG] User ${userId} sent ${messageCount[userId].length} messages in 1 second - BLOCKING`, 'red'));
                
                try {
                  // Block the user (works in both DMs and groups)
                  await sock.updateBlockStatus(userId, 'block');
                  console.log(color(`[ANTIBUG] Successfully blocked ${userId}`, 'green'));
                  
                  // Send notification to the chat (only in groups, skip for DMs since user is blocked)
                  const chatJid = msg.key.remoteJid;
                  if (chatJid.endsWith('@g.us')) {
                    await sock.sendMessage(chatJid, {
                      text: `🛡️ *Antibug Protection Activated*\n\n❌ User blocked for sending ${messageCount[userId].length} messages in 1 second.\n\n*Reason:* Spam/Bug detected`
                    }, { quoted: msg });
                  }

                  // Clear the message count for the user after blocking
                  delete messageCount[userId];
                  continue; // Skip processing this message
                } catch (blockError) {
                  console.log(color(`[ANTIBUG] Failed to block user: ${blockError.message}`, 'red'));
                }
              } else {
                console.log(color(`[ANTIBUG] Spam detected but antibug is disabled. Enable with ${COMMAND_PREFIX}antibug on`, 'yellow'));
              }
            }
          }

          // Handle automation features
          if (!isFromMe && global.autoReact) {
            try {
              const reactions = ['❤️', '😍', '😊', '👍', '🔥', '💯', '😎', '🤩'];
              const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
              await sock.sendMessage(msg.key.remoteJid, {
                react: {
                  text: randomReaction,
                  key: msg.key
                }
              });
            } catch (e) {
              console.log('[WARN] Auto react failed:', e.message);
            }
          }

          if (!isFromMe && global.autoViewMessage && msg.message.viewOnceMessage) {
            try {
              await sock.readMessages([msg.key]);
            } catch (e) {
              console.log('[WARN] Auto view message failed:', e.message);
            }
          }

          if (!isFromMe && global.autoTyping) {
            try {
              await sock.sendPresenceUpdate('composing', msg.key.remoteJid);
              setTimeout(() => {
                sock.sendPresenceUpdate('paused', msg.key.remoteJid);
              }, 2000);
            } catch (e) {
              console.log('[WARN] Auto typing failed:', e.message);
            }
          }

          if (!isFromMe && global.autoRecording) {
            try {
              await sock.sendPresenceUpdate('recording', msg.key.remoteJid);
              setTimeout(() => {
                sock.sendPresenceUpdate('paused', msg.key.remoteJid);
              }, 3000);
            } catch (e) {
              console.log('[WARN] Auto recording failed:', e.message);
            }
          }
          let remoteJid = msg.key.remoteJid;
          if (!remoteJid) return;
          
          // Fix: Convert @lid (linked device) to actual sender JID for private messages
          // @lid means the message came from the linked device (web/desktop)
          if (remoteJid.endsWith('@lid')) {
            // Extract the actual phone number from @lid JID
            const phoneNumber = remoteJid.split('@')[0];
            remoteJid = `${phoneNumber}@s.whatsapp.net`;
            console.log(color(`[DEBUG] Converted @lid to private DM: ${remoteJid}`, 'cyan'));
          }
          
          const isGroup = remoteJid.endsWith('@g.us');
          const isNewsletter = remoteJid.endsWith('@newsletter');

          // Import newsletter config for consistency
          const { NEWSLETTER_CHANNEL } = await import('./lib/channelConfig.js');
          const isTargetNewsletter = remoteJid === NEWSLETTER_CHANNEL;
          
          // Handle sender JID - newsletters may not have participant
          let senderJid;
          if (isNewsletter) {
            // For newsletters, use the bot's own JID as sender (bot is reading its own channel)
            // This allows the bot to process commands from the newsletter
            senderJid = sock.user?.id || msg.key.participant || remoteJid;
            console.log(color(`[NEWSLETTER] Processing message from newsletter: ${remoteJid}`, 'cyan'));
          } else if (isGroup) {
            senderJid = msg.key.participant;
          } else {
            senderJid = remoteJid;
          }
          
          // Allow newsletter messages even without participant (bot processes its own channel)
          if (!senderJid && !isNewsletter) return;
          const senderNumber = await normalizeJid(sock, senderJid || remoteJid, (isGroup || isNewsletter) ? remoteJid : null);

          // Store ALL messages for antidelete tracking (not just bot's own messages)
          await storeMessage(sock, msg);

          let body = '';
          const messageType = Object.keys(msg.message)[0];
          if (messageType === 'protocolMessage') {
            // Check if it's a message deletion (revoke)
            if (msg.message.protocolMessage?.type === 0) {
              await handleMessageRevocation(sock, msg);
            }
            return; // Skip protocol messages after handling
          }
          switch (messageType) {
            case 'conversation':
              body = msg.message.conversation;
              break;
            case 'extendedTextMessage':
              body = msg.message.extendedTextMessage.text;
              break;
            case 'imageMessage':
              body = msg.message.imageMessage.caption || '';
              break;
            case 'videoMessage':
              body = msg.message.videoMessage.caption || '';
              break;
            case 'newsletterAdminInviteMessage':
              body = msg.message.newsletterAdminInviteMessage.text || '';
              break;
            case 'messageContextInfo':
              // Handle newsletter forwarded messages
              if (msg.message.messageContextInfo?.extendedTextMessage) {
                body = msg.message.messageContextInfo.extendedTextMessage.text;
              } else if (msg.message.messageContextInfo?.conversation) {
                body = msg.message.messageContextInfo.conversation;
              } else {
                body = '';
              }
              break;
            case 'buttonsResponseMessage':
              // Handle button clicks from interactive messages
              const selectedButtonId = msg.message.buttonsResponseMessage.selectedButtonId;

              // Check if it's a command button (starts with prefix)
              if (selectedButtonId && selectedButtonId.startsWith(COMMAND_PREFIX)) {
                // Treat button click as a command
                body = selectedButtonId;
                console.log(color(`[BUTTON] ${senderNumber}: ${body}`, 'cyan'));
                break; // Continue to command processing
              }

              // Handle predefined button responses
              if (buttonResponses[selectedButtonId]) {
                const response = buttonResponses[selectedButtonId];
                try {
                  if (response.contact) {
                    // Send contact card
                    await sock.sendMessage(remoteJid, {
                      contacts: {
                        displayName: response.contact.name,
                        contacts: [{
                          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${response.contact.name}\nTEL:${response.contact.phone}\nEND:VCARD`
                        }]
                      }
                    }, { quoted: msg });
                  } else {
                    // Send text response
                    await sock.sendMessage(remoteJid, {
                      text: response.text
                    }, { quoted: msg });
                  }
                } catch (error) {
                  console.log(`[ERROR] Failed to send button response: ${error.message}`);
                }
              }
              return; // Don't process as regular command
            case 'interactiveResponseMessage':
              // Handle new interactive message button clicks
              const nativeFlowResponse = msg.message.interactiveResponseMessage?.nativeFlowResponseMessge?.paramsJson;
              if (nativeFlowResponse) {
                try {
                  const params = JSON.parse(nativeFlowResponse);
                  const buttonId = params.id;

                  // Check if it's a command button (starts with prefix)
                  if (buttonId && buttonId.startsWith(COMMAND_PREFIX)) {
                    // Treat button click as a command
                    body = buttonId;
                    console.log(color(`[INTERACTIVE] ${senderNumber}: ${body}`, 'cyan'));
                    break; // Continue to command processing
                  }
                } catch (parseError) {
                  console.log(`[ERROR] Failed to parse interactive response: ${parseError.message}`);
                }
              }
              return; // Don't process as regular command
            case 'listResponseMessage':
              // Handle list selection clicks  
              const selectedRowId = msg.message.listResponseMessage.singleSelectReply.selectedRowId;

              // Check if it's a command button (starts with prefix)
              if (selectedRowId && selectedRowId.startsWith(COMMAND_PREFIX)) {
                // Treat list selection as a command
                body = selectedRowId;
                console.log(color(`[LIST] ${senderNumber}: ${body}`, 'cyan'));
                break; // Continue to command processing
              }
              return; // Don't process as regular command
            default:
              console.log(`[INFO] Skipping unsupported message type: ${messageType}`);
              return;
          }
          if (!body || typeof body !== 'string') return;

          // Attach body to msg object for commands that need it
          msg.body = body;

          console.log(color(`[${isGroup ? 'GROUP' : isNewsletter ? 'NEWSLETTER' : 'DM'}] ${senderNumber}: ${body}`, msg.key.fromMe ? 'magenta' : 'white'));

          // Anti-detection for groups using proper antilink system
          if (isGroup && !isNewsletter && !isFromMe) {
            // Use the proper antilink detection system
            try {
              await handleLinkDetection(sock, remoteJid, msg, body, senderJid);
            } catch (antilinkError) {
              console.log(color(`[WARN] Antilink detection error: ${antilinkError.message}`, 'yellow'));
            }

            // Keep anti-badword detection
            if (global.antiBadWord[remoteJid]) {
              const badWords = ['fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'idiot', 'stupid'];
              const containsBadWord = badWords.some(word => body.toLowerCase().includes(word.toLowerCase()));

              if (containsBadWord) {
                try {
                  const { isBotAdmin, isSenderAdmin } = await isAdmin(sock, remoteJid, senderJid);
                  if (isBotAdmin && !isSenderAdmin) {
                    await sock.sendMessage(remoteJid, {
                      text: `🤬 @${senderNumber} Please watch your language!`,
                      mentions: [senderJid]
                    }, { quoted: msg });
                  }
                } catch (e) {
                  console.log('[WARN] Anti-badword failed:', e.message);
                }
              }
            }
          }


          // Keepalive command system - available in self mode or to owner
          if (body.startsWith(`${COMMAND_PREFIX}keepalive`) || body.startsWith(`${COMMAND_PREFIX}keepon`) || body.startsWith(`${COMMAND_PREFIX}keepoff`)) {
            // In self mode, allow anyone. In public mode, restrict to owner
            const ownerNum = config.ownerNumber.replace(/\+/g, '');
            const isAuthorized = (botMode === 'self') || (isFromMe) || (senderNumber === ownerNum);

            if (isAuthorized) {
              const commandName = body.slice(COMMAND_PREFIX.length).trim().toLowerCase();
              if (commandName === 'keepon' || commandName === 'keepoff' || commandName.startsWith('keepalive')) {
                try {
                  // Validate remoteJid exists
                  if (!remoteJid) {
                    console.log(color('[ERROR] Cannot execute keepalive: remoteJid is undefined', 'red'));
                    return;
                  }
                  
                  const keepaliveModule = await import('./eclipse-plug/keepalive.js');
                  // Parse the full command with URL arguments
                  const fullArgs = body.slice(COMMAND_PREFIX.length).trim().split(/\s+/);
                  const cmdArgs = fullArgs.slice(1); // Remove command name, keep only arguments
                  
                  // Call with the correct signature that keepalive.js expects
                  await keepaliveModule.default.execute(msg, {
                    sock,
                    args: cmdArgs,
                    isOwner: true,
                    settings: { prefix: COMMAND_PREFIX }
                  });
                  return;
                } catch (error) {
                  console.log(color(`[ERROR] Keepalive command error: ${error.message}`, 'red'));
                  console.log(color(`[ERROR] Stack trace:`, 'red'), error.stack);
                  try {
                    await sock.sendMessage(remoteJid, {
                      text: '❌ Keepalive system error. Check logs for details.'
                    });
                  } catch (sendError) {
                    console.log(color(`[ERROR] Failed to send error message: ${sendError.message}`, 'red'));
                  }
                  return;
                }
              }
            } else {
              await sock.sendMessage(remoteJid, {
                text: '❌ Unauthorized. Keepalive commands are restricted to bot owner or self mode.'
              });
              return;
            }
          }

          // Handle newsletter channel commands properly
          if (isNewsletter && body.startsWith(COMMAND_PREFIX)) {
            console.log(color(`[NEWSLETTER] Command detected in newsletter: ${body}`, 'cyan'));
            // Newsletters require admin permissions to send messages
            // The bot must be an admin of the newsletter to respond
            // Continue processing - the command execution will attempt to respond
          }

          // Handle shell commands with $ prefix
          if (body.startsWith('$') && body.length > 1) {
            const shellCommand = body.slice(1).trim();
            
            if (shellCommand) {
              try {
                const shellModule = await import('./eclipse-plug/shell.js');
                const shellArgs = shellCommand.split(/\s+/);
                
                await shellModule.default.execute(msg, {
                  sock,
                  args: shellArgs,
                  isOwner: isOwner,
                  settings: { prefix: COMMAND_PREFIX }
                });
              } catch (error) {
                console.error('Shell command error:', error);
                await sock.sendMessage(remoteJid, {
                  text: `❌ Shell command failed:\n${error.message}`
                }, { quoted: msg });
              }
              return;
            }
          }

          if (body.startsWith(COMMAND_PREFIX)) {
            const args = body.slice(COMMAND_PREFIX.length).trim().split(/\s+/);
            const commandName = args.shift()?.toLowerCase();
            if (!commandName) {
              await sock.sendMessage(remoteJid, {
                text: `❓ Empty command. Try \`${COMMAND_PREFIX}help\` for available commands.`,
              }, { quoted: msg });
              return;
            }

            // Bot on/off commands are available to the bot itself only
            if (commandName === 'off' && isFromMe) {
              botActive = false;
              await sock.sendMessage(remoteJid, { text: '❌ Bot deactivated.' }, { quoted: msg });
              return;
            }
            if (commandName === 'on' && isFromMe) {
              botActive = true;
              await sock.sendMessage(remoteJid, { text: '✅ Bot activated.' }, { quoted: msg });
              return;
            }

            // Mode switching commands (bot itself only)
            if (commandName === 'public' && isFromMe) {
              botMode = 'public';
              updateSetting('botMode', 'public');
              await sock.sendMessage(remoteJid, { text: '🌐 Bot switched to PUBLIC mode. Everyone can use public commands.' }, { quoted: msg });
              return;
            }
            if (commandName === 'self' && isFromMe) {
              botMode = 'self';
              updateSetting('botMode', 'self');
              await sock.sendMessage(remoteJid, { text: '🤖 Bot switched to SELF mode. Only bot can use commands.' }, { quoted: msg });
              return;
            }
            if (!botActive) {
              if (isFromMe) {
                await sock.sendMessage(remoteJid, {
                  text: '❌ Bot is currently offline.',
                }, { quoted: msg });
              }
              return;
            }

            // Check if sender is the owner
            // Extract just the numbers for comparison (works with both DMs and groups)
            const ownerNumber = config.ownerNumber.replace(/[^\d]/g, ''); // Remove all non-digits
            const extractedSenderNumber = senderNumber?.replace(/[^\d]/g, '') || ''; // Remove all non-digits
            const isOwner = isFromMe || extractedSenderNumber === ownerNumber;

            // Check bot mode and message origin
            if (botMode === 'self' && !isOwner) {
              // In self mode, only process messages from owner (including bot itself)
              // Exception: Allow newsletter commands if from target newsletter
              if (!isTargetNewsletter) {
                return;
              }
            }

            // Get command from appropriate command set based on mode
            let command;

            if (botMode === 'self') {
              // In self mode, bot can use both public and self commands
              command = commands.get(commandName) || selfCommands.get(commandName);
              if (!command) {
                // In self mode, don't send "unknown command" messages
                // Just silently ignore unknown commands
                return;
              }
            } else {
              // In public mode, check if it's a self command first
              if (selfCommands.get(commandName)) {
                if (isFromMe) {
                  await sock.sendMessage(remoteJid, {
                    text: `🤖 Bot is in PUBLIC mode. Switch to SELF mode to use this command.\nUse \`${COMMAND_PREFIX}self\` to switch modes.`,
                  }, { quoted: msg });
                } else {
                  await sock.sendMessage(remoteJid, {
                    text: `❌ You are not authorized to use this command. This is a self-mode only command.`,
                  }, { quoted: msg });
                }
                return;
              }

              // Check for public commands
              command = commands.get(commandName);
              if (!command) {
                await sock.sendMessage(remoteJid, {
                  text: `❓ Unknown command: *${commandName}*\nTry \`${COMMAND_PREFIX}menu\` for available commands.`,
                }, { quoted: msg });
                return;
              }
            }

            // Execute command
            try {
              await command.execute(msg, {
                sock,
                args,
                isOwner: isOwner, // Owner based on config or env
                settings: { prefix: COMMAND_PREFIX },
              });
            } catch (error) {
              console.error(`Command execution error: ${command.name}:`, error);

              // More specific error messages
              let errorMsg = `❌ Command error: ${command.name}\n`;
              if (error.message?.includes('timeout')) {
                errorMsg += '⏰ Request timed out. Try again in a moment.';
              } else if (error.message?.includes('network') || error.message?.includes('ENOTFOUND')) {
                errorMsg += '🌐 Network error. Check your connection.';
              } else if (error.message?.includes('permission') || error.message?.includes('forbidden')) {
                errorMsg += '🔒 Permission denied. Check bot permissions.';
              } else {
                errorMsg += `🔧 ${error.message || 'Try again later.'}`;
              }

              await sock.sendMessage(remoteJid, {
                text: errorMsg
              }, { quoted: msg });
            }

          } else {
            // If not a command, check for chatbot response
            if (chatbotHandler && !isFromMe) {
              try {
                await chatbotHandler(sock, msg, body, senderJid);
              } catch (chatbotErr) {
                console.log(color(`[WARN] Chatbot error: ${chatbotErr.message}`, 'yellow'));
              }
            }
          }
        } catch (error) {
          console.error('[BOT] Error processing message:', error);
          // Don't break the bot, continue processing other messages
          try {
            await sock.sendMessage(msg.key.remoteJid, {
              text: '❌ An error occurred while processing your command. Please try again later.'
            }, { quoted: msg });
          } catch (sendError) {
            console.error('[BOT] Error sending error message:', sendError);
          }
        }
      }
    });

    process.on('SIGINT', async () => {
      console.log(color('\n[INFO] Shutting down gracefully...', 'yellow'));
      try {
        if (sock?.end) await sock.end();
      } catch (err) {
        console.log(color(`[WARN] Shutdown error: ${err.message}`, 'yellow'));
      }
      process.exit(0);
    });
  } catch (err) {
    console.log(color(`[ERROR] Bot startup failed: ${err.message}`, 'red'));
    console.log(color('[INFO] Retrying in 15 seconds...', 'yellow'));
    setTimeout(startBot, 15000);
  }
}

// Import and start web interface
import('./lib/web.js');

// Display ASCII art for ECLIPSE-MD (compact logo design)
const asciiArt = `
  _____ _____ _      ___ ___  ___  ___     __  __ ___  
 | ____|_   _| |    |_ _| _ \\/ __|/ __|   |  \\/  |   \\ 
 | _|   | | | |__    | ||  _/\\__ \\  _|_   | |\\/| | |) |
 |___|  |_| |____|  |___|_|  |___/|___|   |_|  |_|___/ 
                                                        
     🌙 Advanced WhatsApp Bot Framework 🤖         
`;

console.log(color(asciiArt, 'cyan'));
console.log(color('🌙 Eclipse-MD WhatsApp Bot Starting...', 'magenta'));
console.log('═'.repeat(50));
startBot().catch(err => {
  console.log(color(`[FATAL] Critical startup error: ${err.message}`, 'red'));
  process.exit(1);
});
