import fs from 'fs';
import path from 'path';
import config from '../../config.js';

// Owner number for access control
const OWNER_NUMBER = config.ownerNumber.replace(/^\+/, '');
const OWNER_JID = `${OWNER_NUMBER}@s.whatsapp.net`;

const DATA_DIR = path.resolve('./data');
const ANTIBUG_FILE = path.join(DATA_DIR, 'antibug_settings.json');

// Normalize phone number
const normalizeNumber = (number) => {
  return number.replace(/[^0-9]/g, '').replace(/^0+/, '').replace(/^\+234/, '234') || number;
};

// Load antibug settings
function loadAntibugSettings() {
  if (!fs.existsSync(ANTIBUG_FILE)) {
    return { enabled: false };
  }
  try {
    return JSON.parse(fs.readFileSync(ANTIBUG_FILE, 'utf-8'));
  } catch {
    return { enabled: false };
  }
}

// Save antibug settings
function saveAntibugSettings(settings) {
  fs.writeFileSync(ANTIBUG_FILE, JSON.stringify(settings, null, 2));
}

export default {
  name: 'antibug',
  description: '🛡️ Enable or disable anti-spam/antibug feature (Owner only)',
  aliases: ['antispam', 'pmlock'],
  category: 'Owner',
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderNumber = senderJid.split('@')[0];

    console.log(`[DEBUG] antibug triggered by ${senderJid} in ${from}`);

    const userName = msg.pushName || "User";

    // Check if user is owner
    const normalizedSender = normalizeNumber(senderNumber);
    const normalizedOwner = normalizeNumber(OWNER_NUMBER);
    const isOwner = senderJid === OWNER_JID || normalizedSender === normalizedOwner;

    console.log(`[DEBUG] Owner check: isOwner=${isOwner}, normalizedSender=${normalizedSender}, normalizedOwner=${normalizedOwner}`);

    if (!isOwner) {
      console.log(`[DEBUG] antibug: User is not the owner`);
      await sock.sendMessage(from, {
        text: `❌ *Access Denied*\n\nThis command is only available to the bot owner.`
      }, { quoted: msg });
      return;
    }

    const settings = loadAntibugSettings();

    // If no argument provided, show current status
    if (!args[0]) {
      const status = settings.enabled ? '✅ Enabled' : '❌ Disabled';
      await sock.sendMessage(from, {
        text: `🛡️ *Antibug/Anti-Spam Status*\n\n*Current Status:* ${status}\n\n💡 *Usage:*\n• ${config.prefix}antibug on - Enable\n• ${config.prefix}antibug off - Disable\n\n*Protection Details:*\n• Triggers when: >2 messages in 1 second\n• Action taken: Automatic block\n• Notification sent to group\n\n*Note:* Make sure the bot has admin permissions to block users in groups.`
      }, { quoted: msg });
      return;
    }

    const action = args[0].toLowerCase().trim();

    if (action === 'on' || action === 'enable') {
      if (settings.enabled) {
        await sock.sendMessage(from, {
          text: `⚠️ *Antibug feature is already enabled!*`
        }, { quoted: msg });
        return;
      }

      settings.enabled = true;
      saveAntibugSettings(settings);

      await sock.sendMessage(from, {
        text: `✅ *Antibug Feature Enabled*\n\n🛡️ Anti-spam protection is now active!\n\n*Protection:* Users sending more than 2 messages per second will be automatically blocked.`
      }, { quoted: msg });

    } else if (action === 'off' || action === 'disable') {
      if (!settings.enabled) {
        await sock.sendMessage(from, {
          text: `⚠️ *Antibug feature is already disabled!*`
        }, { quoted: msg });
        return;
      }

      settings.enabled = false;
      saveAntibugSettings(settings);

      await sock.sendMessage(from, {
        text: `❌ *Antibug Feature Disabled*\n\n🛡️ Anti-spam protection has been turned off.`
      }, { quoted: msg });

    } else {
      await sock.sendMessage(from, {
        text: `⚠️ *Invalid Option*\n\n💡 *Usage:*\n• ${config.prefix}antibug on - Enable\n• ${config.prefix}antibug off - Disable`
      }, { quoted: msg });
    }
  }
};
