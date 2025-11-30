import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { writeFile } from 'fs/promises';
import config from '../../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const messageStore = new Map();
const CONFIG_PATH = path.join(process.cwd(), 'data', 'antidelete.json');
const MESSAGES_STORE_PATH = path.join(process.cwd(), 'data', 'antidelete_messages.json');
const TEMP_MEDIA_DIR = path.join(process.cwd(), 'tmp');

if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

const getFolderSizeInMB = (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        }

        return totalSize / (1024 * 1024);
    } catch (err) {
        console.error('Error getting folder size:', err);
        return 0;
    }
};

const cleanTempFolderIfLarge = () => {
    try {
        const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);
        
        if (sizeMB > 200) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                const filePath = path.join(TEMP_MEDIA_DIR, file);
                fs.unlinkSync(filePath);
            }
            console.log('[ANTIDELETE] Cleaned temp folder - size was', sizeMB.toFixed(2), 'MB');
        }
    } catch (err) {
        console.error('Temp cleanup error:', err);
    }
};

// Clean old messages from storage (older than 7 days)
const cleanOldMessages = () => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        let cleanedCount = 0;
        
        for (const [messageId, data] of messageStore.entries()) {
            if (data.timestamp) {
                const messageDate = new Date(data.timestamp);
                if (messageDate < sevenDaysAgo) {
                    // Delete associated media file if exists
                    if (data.mediaPath && fs.existsSync(data.mediaPath)) {
                        try { fs.unlinkSync(data.mediaPath); } catch {}
                    }
                    messageStore.delete(messageId);
                    cleanedCount++;
                }
            }
        }
        
        if (cleanedCount > 0) {
            saveStoredMessages();
            console.log(`[ANTIDELETE] Cleaned ${cleanedCount} old messages (>7 days)`);
        }
    } catch (err) {
        console.error('[ANTIDELETE] Error cleaning old messages:', err);
    }
};

// Run cleanup every hour for temp folder and old messages
setInterval(() => {
    cleanTempFolderIfLarge();
    cleanOldMessages();
}, 60 * 60 * 1000); // Every hour

function loadAntideleteConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { enabled: false };
        return JSON.parse(fs.readFileSync(CONFIG_PATH));
    } catch {
        return { enabled: false };
    }
}

function saveAntideleteConfig(config) {
    try {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Config save error:', err);
    }
}

// Load stored messages from file
function loadStoredMessages() {
    try {
        if (!fs.existsSync(MESSAGES_STORE_PATH)) return {};
        const data = JSON.parse(fs.readFileSync(MESSAGES_STORE_PATH, 'utf8'));
        // Convert back to Map
        Object.entries(data).forEach(([key, value]) => {
            messageStore.set(key, value);
        });
        console.log(`[ANTIDELETE] Loaded ${messageStore.size} stored messages`);
    } catch (err) {
        console.error('[ANTIDELETE] Error loading stored messages:', err);
    }
}

// Save stored messages to file
function saveStoredMessages() {
    try {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        // Convert Map to object for JSON storage
        const data = Object.fromEntries(messageStore);
        fs.writeFileSync(MESSAGES_STORE_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('[ANTIDELETE] Error saving stored messages:', err);
    }
}

// Load messages on startup
loadStoredMessages();

export default {
    name: 'antidelete',
    description: 'Configure anti-delete message tracking (self mode only)',
    aliases: ['antidel'],
    async execute(msg, { sock, args, isOwner, settings }) {
        const from = msg.key.remoteJid;

        if (!msg.key.fromMe) {
            return await sock.sendMessage(from, {
                text: '❌ This is a self mode command. Only accessible when using your own account.'
            }, { quoted: msg });
        }

        const config = loadAntideleteConfig();

        if (!args[0]) {
            return await sock.sendMessage(from, {
                text: `🗑️ *ANTIDELETE CONFIGURATION*

📊 **Current Status:** ${config.enabled ? '✅ Enabled' : '❌ Disabled'}

**Commands:**
• \`${settings.prefix}antidelete on\` - Enable anti-delete tracking
• \`${settings.prefix}antidelete off\` - Disable anti-delete tracking
• \`${settings.prefix}antidelete status\` - Check current status

**Features:**
• Tracks all messages in chats
• Notifies you when messages are deleted
• Saves deleted media for recovery
• Includes anti-view-once protection
• Auto-cleans temp folder when > 200MB`
            }, { quoted: msg });
        }

        const action = args[0].toLowerCase();

        switch (action) {
            case 'on':
            case 'enable':
                config.enabled = true;
                saveAntideleteConfig(config);
                await sock.sendMessage(from, {
                    text: '✅ *Anti-delete tracking enabled!*\n\n🔍 Now monitoring all chats for deleted messages and view-once media.'
                }, { quoted: msg });
                break;

            case 'off':
            case 'disable':
                config.enabled = false;
                saveAntideleteConfig(config);
                await sock.sendMessage(from, {
                    text: '❌ *Anti-delete tracking disabled!*'
                }, { quoted: msg });
                break;

            case 'status':
                const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);
                const storedMessages = messageStore.size;
                
                await sock.sendMessage(from, {
                    text: `📊 *ANTIDELETE STATUS*

🔄 **Status:** ${config.enabled ? '✅ Active' : '❌ Inactive'}
💾 **Messages in Memory:** ${storedMessages}
📁 **Temp Folder Size:** ${sizeMB.toFixed(2)} MB`
                }, { quoted: msg });
                break;

            default:
                await sock.sendMessage(from, {
                    text: '❌ Invalid option! Use `' + settings.prefix + 'antidelete` to see available commands.'
                }, { quoted: msg });
        }
    }
};

export async function storeMessage(sock, message) {
    try {
        // Check if antidelete is enabled - if not, don't store anything
        const config = loadAntideleteConfig();
        if (!config.enabled) {
            console.log('[ANTIDELETE] Skipping storage - antidelete is disabled');
            return;
        }

        if (!message.key?.id) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';
        let isViewOnce = false;

        const sender = message.key.participant || message.key.remoteJid;

        // Check for view-once messages with multiple format support (V1, V2, V2Extension)
        const viewOnceContainer = message.message?.viewOnceMessageV2?.message || 
                                  message.message?.viewOnceMessage?.message ||
                                  message.message?.viewOnceMessageV2Extension?.message;
        
        if (viewOnceContainer) {
            isViewOnce = true;
            if (viewOnceContainer.imageMessage) {
                mediaType = 'image';
                content = viewOnceContainer.imageMessage.caption || '';
                try {
                    const stream = await downloadContentFromMessage(viewOnceContainer.imageMessage, 'image');
                    const chunks = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    const buffer = Buffer.concat(chunks);
                    mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                    await writeFile(mediaPath, buffer);
                    console.log(`[ANTIDELETE] View-once image saved: ${messageId}`);
                } catch (err) {
                    console.error('[ANTIDELETE] Error downloading view-once image:', err);
                }
            } else if (viewOnceContainer.videoMessage) {
                mediaType = 'video';
                content = viewOnceContainer.videoMessage.caption || '';
                try {
                    const stream = await downloadContentFromMessage(viewOnceContainer.videoMessage, 'video');
                    const chunks = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    const buffer = Buffer.concat(chunks);
                    mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                    await writeFile(mediaPath, buffer);
                    console.log(`[ANTIDELETE] View-once video saved: ${messageId}`);
                } catch (err) {
                    console.error('[ANTIDELETE] Error downloading view-once video:', err);
                }
            } else if (viewOnceContainer.audioMessage) {
                mediaType = 'audio';
                content = 'View-once audio message';
                try {
                    const stream = await downloadContentFromMessage(viewOnceContainer.audioMessage, 'audio');
                    const chunks = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    const buffer = Buffer.concat(chunks);
                    const mime = viewOnceContainer.audioMessage.mimetype || '';
                    const ext = mime.includes('mpeg') ? 'mp3' : (mime.includes('ogg') ? 'ogg' : 'mp3');
                    mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
                    await writeFile(mediaPath, buffer);
                    console.log(`[ANTIDELETE] View-once audio saved: ${messageId}`);
                } catch (err) {
                    console.error('[ANTIDELETE] Error downloading view-once audio:', err);
                }
            }
        } else if (message.message?.conversation) {
            content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            try {
                const stream = await downloadContentFromMessage(message.message.imageMessage, 'image');
                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                await writeFile(mediaPath, buffer);
            } catch (err) {
                console.error('Error downloading image:', err);
            }
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            try {
                const stream = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
                await writeFile(mediaPath, buffer);
            } catch (err) {
                console.error('Error downloading sticker:', err);
            }
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            try {
                const stream = await downloadContentFromMessage(message.message.videoMessage, 'video');
                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                await writeFile(mediaPath, buffer);
            } catch (err) {
                console.error('Error downloading video:', err);
            }
        } else if (message.message?.audioMessage) {
            mediaType = 'audio';
            try {
                const stream = await downloadContentFromMessage(message.message.audioMessage, 'audio');
                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);
                const mime = message.message.audioMessage.mimetype || '';
                const ext = mime.includes('mpeg') ? 'mp3' : (mime.includes('ogg') ? 'ogg' : 'mp3');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
                await writeFile(mediaPath, buffer);
            } catch (err) {
                console.error('Error downloading audio:', err);
            }
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: new Date().toISOString()
        });

        // Save to persistent storage
        saveStoredMessages();

        if (isViewOnce && mediaType && fs.existsSync(mediaPath)) {
            try {
                // Use owner number from config.js
                const ownerNumber = config.ownerNumber.replace(/^\+/, '') + '@s.whatsapp.net';
                const senderName = sender.split('@')[0];
                const mediaOptions = {
                    caption: `🔓 *Anti-ViewOnce ${mediaType}*\n👤 From: @${senderName}`,
                    mentions: [sender]
                };
                if (mediaType === 'image') {
                    await sock.sendMessage(ownerNumber, { image: { url: mediaPath }, ...mediaOptions });
                } else if (mediaType === 'video') {
                    await sock.sendMessage(ownerNumber, { video: { url: mediaPath }, ...mediaOptions });
                }
                try { fs.unlinkSync(mediaPath); } catch {}
            } catch (e) {
                console.error('[ANTIDELETE] Error forwarding view-once:', e);
            }
        }

        console.log(`[ANTIDELETE] Stored message ${messageId.substring(0, 10)}...`);

    } catch (err) {
        console.error('storeMessage error:', err);
    }
}

export async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const antideleteConfig = loadAntideleteConfig();
        if (!antideleteConfig.enabled) return;

        const messageId = revocationMessage.message?.protocolMessage?.key?.id;
        if (!messageId) return;

        // Check if the deletion was done by the bot owner (self)
        const isDeletedBySelf = revocationMessage.key?.fromMe === true;
        
        // If deleted by self (bot owner), skip - we only want to track messages deleted by others
        if (isDeletedBySelf) {
            console.log(`[ANTIDELETE] Skipping - message deleted by self (owner)`);
            // Clean up stored message and media
            const original = messageStore.get(messageId);
            if (original && original.mediaPath && fs.existsSync(original.mediaPath)) {
                try { fs.unlinkSync(original.mediaPath); } catch {}
            }
            messageStore.delete(messageId);
            saveStoredMessages();
            return;
        }

        const deletedBy = revocationMessage.participant || revocationMessage.key?.participant || revocationMessage.key?.remoteJid;
        
        // Use owner number from config.js
        const ownerNumber = config.ownerNumber.replace(/^\+/, '') + '@s.whatsapp.net';
        
        console.log(`[ANTIDELETE] Message deleted - ID: ${messageId.substring(0, 10)}... by ${deletedBy}`);

        const original = messageStore.get(messageId);
        if (!original) {
            console.log(`[ANTIDELETE] No stored message found for ID: ${messageId.substring(0, 10)}...`);
            
            // Still notify owner that a message was deleted, even if we don't have it stored
            const time = new Date().toLocaleString('en-US', {
                timeZone: 'Africa/Lagos',
                hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit',
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            
            await sock.sendMessage(ownerNumber, {
                text: `🗑️ *ANTIDELETE ALERT*\n\n*🗑️ Deleted By:* @${deletedBy.split('@')[0]}\n*🕒 Time:* ${time}\n\n⚠️ Message was not stored (possibly deleted too quickly or view-once message already forwarded)`,
                mentions: [deletedBy]
            });
            return;
        }

        const sender = original.sender;
        const senderName = sender.split('@')[0];
        let groupName = '';
        
        if (original.group) {
            try {
                const groupMeta = await sock.groupMetadata(original.group);
                groupName = groupMeta.subject;
            } catch (err) {
                groupName = 'Unknown Group';
            }
        }

        const time = new Date().toLocaleString('en-US', {
            timeZone: 'Africa/Lagos',
            hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit',
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        let text = `🗑️ *ANTIDELETE ALERT*\n\n` +
            `*🗑️ Deleted By:* @${deletedBy.split('@')[0]}\n` +
            `*👤 Sender:* @${senderName}\n` +
            `*📱 Number:* ${sender}\n` +
            `*🕒 Time:* ${time}\n`;

        if (groupName) text += `*👥 Group:* ${groupName}\n`;

        if (original.content) {
            text += `\n*💬 Deleted Message:*\n${original.content}`;
        }

        await sock.sendMessage(ownerNumber, {
            text,
            mentions: [deletedBy, sender]
        });

        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOptions = {
                caption: `🗑️ *Deleted ${original.mediaType}*\n👤 From: @${senderName}`,
                mentions: [sender]
            };

            try {
                switch (original.mediaType) {
                    case 'image':
                        await sock.sendMessage(ownerNumber, {
                            image: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'sticker':
                        await sock.sendMessage(ownerNumber, {
                            sticker: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'video':
                        await sock.sendMessage(ownerNumber, {
                            video: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'audio':
                        await sock.sendMessage(ownerNumber, {
                            audio: { url: original.mediaPath },
                            mimetype: 'audio/mpeg',
                            ptt: false,
                            ...mediaOptions
                        });
                        break;
                }
            } catch (err) {
                await sock.sendMessage(ownerNumber, {
                    text: `⚠️ Error sending media: ${err.message}`
                });
            }

            try {
                fs.unlinkSync(original.mediaPath);
            } catch (err) {
                console.error('Media cleanup error:', err);
            }
        }

        messageStore.delete(messageId);
        saveStoredMessages();
        console.log('[ANTIDELETE] Deletion alert sent successfully');

    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
}
