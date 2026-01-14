import fs from 'fs';
import path from 'path';
import isAdmin from '../lib/isAdmin.js';

const DATA_DIR = path.resolve('./data');
const ANTIMENTION_FILE = path.join(DATA_DIR, 'antimention.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function loadSettings() {
    if (!fs.existsSync(ANTIMENTION_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(ANTIMENTION_FILE, 'utf-8'));
    } catch {
        return {};
    }
}

function saveSettings(settings) {
    fs.writeFileSync(ANTIMENTION_FILE, JSON.stringify(settings, null, 2));
}

export default {
    name: 'antimention',
    description: 'Delete messages that tag the entire group (@everyone / @tagall)',
    aliases: ['antigmention'],
    async execute(msg, { sock, args }) {
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid.endsWith('@g.us')) {
            return sock.sendMessage(remoteJid, { text: '❌ This command can only be used in groups.' }, { quoted: msg });
        }

        const sender = msg.key.participant || msg.key.remoteJid;
        const { isSenderAdmin } = await isAdmin(sock, remoteJid, sender);
        if (!isSenderAdmin) {
            return sock.sendMessage(remoteJid, { text: '❌ This command is for group admins only.' }, { quoted: msg });
        }

        const settings = loadSettings();
        const action = args[0]?.toLowerCase();

        if (action === 'on') {
            settings[remoteJid] = true;
            saveSettings(settings);
            return sock.sendMessage(remoteJid, { text: '✅ Anti-Group Mention enabled. Messages tagging everyone will be deleted.' }, { quoted: msg });
        } else if (action === 'off') {
            delete settings[remoteJid];
            saveSettings(settings);
            return sock.sendMessage(remoteJid, { text: '❌ Anti-Group Mention disabled.' }, { quoted: msg });
        } else {
            return sock.sendMessage(remoteJid, { text: '⚡ Usage:\n• antimention on\n• antimention off' }, { quoted: msg });
        }
    },

    async onMessage(msg, { sock }) {
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || !remoteJid.endsWith('@g.us')) return;

        const sender = msg.key.participant || msg.key.remoteJid;
        const { isSenderAdmin } = await isAdmin(sock, remoteJid, sender);
        if (isSenderAdmin || msg.key.fromMe) return;

        const settings = loadSettings();
        if (!settings[remoteJid]) return;

        const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';
        
        // Detect @everyone or @tagall mentions
        const groupMentionPatterns = [/@everyone/i, /@tagall/i, /@all/i];
        const isGroupMention = groupMentionPatterns.some(pattern => pattern.test(messageText));

        // Detect mentions of the group itself (often from forwarded status or external posts)
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const externalAd = contextInfo?.externalAdReply;
        const isGroupLinkOrMention = /chat\.whatsapp\.com\/[a-zA-Z0-9]+/i.test(messageText) || 
                                   (externalAd && /chat\.whatsapp\.com/i.test(externalAd.sourceUrl || ''));

        if (isGroupMention || isGroupLinkOrMention) {
            try {
                await sock.sendMessage(remoteJid, { delete: msg.key });
                // If it's a mention from an external post/status
                if (isGroupLinkOrMention) {
                   await sock.sendMessage(remoteJid, { 
                       text: `⚠️ @${sender.split('@')[0]}, mentioning/posting the group from external sources is not allowed!`, 
                       mentions: [sender] 
                   });
                }
            } catch (e) {}
        }
    }
};
