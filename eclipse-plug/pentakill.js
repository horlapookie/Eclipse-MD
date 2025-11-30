import { horla } from '../lib/horla.js';
import mumaker from 'mumaker';

const pentakill = horla({
  nomCom: "pentakill",
  categorie: "Logo",
  reaction: "🌈"
}, async (msg, { sock, args }) => {
  const from = msg.key.remoteJid;
  const userName = msg.pushName || "User";

  if (!args || args.length === 0) {
    await sock.sendMessage(from, {
      text: `*Example, ${userName}: * ?pentakill text`
    }, { quoted: msg });
    return;
  }

  try {
    await sock.sendMessage(from, {
      text: "*Processing...*"
    }, { quoted: msg });

    const text = Array.isArray(args) ? args.join(' ') : args.toString();
    let anu;
    
    try {
      anu = await mumaker.textpro("https://en.ephoto360.com/create-icon-in-your-league-legend-pentakill-223.html", text);
    } catch (apiError) {
      console.error('[PENTAKILL] API Error:', apiError);
      throw new Error('Logo generation service is currently unavailable. Please try again later.');
    }

    if (!anu || !anu.image) {
      throw new Error('Failed to generate logo. The service returned an invalid response.');
    }

    await sock.sendMessage(from, {
      image: { url: anu.image },
      caption: "*Logo by HORLA POOKIE*"
    }, { quoted: msg });
  } catch (e) {
    console.error('[PENTAKILL] Error:', e);
    await sock.sendMessage(from, {
      text: `❌ *Error:* ${e.message}\n\n💡 Please try again later or contact support if the issue persists.`
    }, { quoted: msg });
  }
});

export default pentakill;
