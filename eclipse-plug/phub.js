import { horla } from '../lib/horla.js';
import mumaker from 'mumaker';

const phub = horla({
  nomCom: "phub",
  categorie: "Logo",
  reaction: "🌈"
}, async (msg, { sock, args }) => {
  const from = msg.key.remoteJid;
  const userName = msg.pushName || "User";

  if (!args || args.length === 0) {
    await sock.sendMessage(from, {
      text: `*Example, ${userName}: * .phub text1|text2`
    }, { quoted: msg });
    return;
  }

  try {
    await sock.sendMessage(from, {
      text: "*Generating logo...*"
    }, { quoted: msg });

    const text = Array.isArray(args) ? args.join(' ') : args.toString();
    const textParts = text.split('|');
    const text1 = textParts[0]?.trim() || 'Porn';
    const text2 = textParts[1]?.trim() || 'Hub';

    const combinedText = `${text1}|${text2}`;
    const anu = await mumaker.textpro("https://en.ephoto360.com/create-pornhub-style-logos-online-free-549.html", [text1, text2]);

    await sock.sendMessage(from, {
      image: { url: anu.image },
      caption: "*Logo by ECLIPSE MD*"
    }, { quoted: msg });

  } catch (e) {
    console.error('[PHUB] Error:', e);
    await sock.sendMessage(from, {
      text: `❌ *Error generating logo*\n\n${e.message}\n\n💡 Please try again with different text. Example: .phub Cool|Text`
    }, { quoted: msg });
  }
});

export default phub;
