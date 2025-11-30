import { horla } from '../lib/horla.js';
import mumaker from 'mumaker';

const pubg = horla({
  nomCom: "pubg",
  categorie: "Logo",
  reaction: "🌈"
}, async (msg, { sock, args }) => {
  const from = msg.key.remoteJid;
  const userName = msg.pushName || "User";

  if (!args || args.length === 0) {
    await sock.sendMessage(from, {
      text: `*Example, ${userName}: * .pubg text`
    }, { quoted: msg });
    return;
  }

  try {
    await sock.sendMessage(from, {
      text: "*Processing PUBG logo...*"
    }, { quoted: msg });

    const text = (Array.isArray(args) ? args.join(' ') : args.toString()).toUpperCase();
    let anu;
    
    try {
      anu = await mumaker.textpro("https://en.ephoto360.com/pubg-mascot-logo-maker-for-an-esports-team-612.html", text);
    } catch (apiError) {
      console.error('[PUBG] API Error:', apiError);
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
    console.error('[PUBG] Error:', e);
    await sock.sendMessage(from, {
      text: `❌ *Error:* ${e.message}\n\n💡 Please try again later or contact support if the issue persists.`
    }, { quoted: msg });
  }
});

export default pubg;








