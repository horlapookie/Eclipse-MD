import { horla } from '../lib/horla.js';
import mumaker from 'mumaker';

export const tattoo = horla({
  nomCom: "tattoo",
  categorie: "Tattoo",
  reaction: "🎨"
}, async (msg, { sock, args }) => {
  const from = msg.key.remoteJid;
  const userName = msg.pushName || "User";

  if (!args || args.length === 0) {
    await sock.sendMessage(from, {
      text: `*Example, ${userName}: * .tattoo ${userName}`
    }, { quoted: msg });
    return;
  }

  try {
    await sock.sendMessage(from, {
      text: "*Creating tattoo effect...*"
    }, { quoted: msg });

    const text = Array.isArray(args) ? args.join(' ') : args.toString();
    const anu = await mumaker.textpro("https://en.ephoto360.com/make-tattoos-online-by-your-name-309.html", text);

    await sock.sendMessage(from, {
      image: { url: anu.image },
      caption: "*Tattoo by ECLIPSE MD*"
    }, { quoted: msg });

  } catch (e) {
    console.error('[TATTOO] Error:', e);
    await sock.sendMessage(from, {
      text: `❌ *Error creating tattoo*\n\n${e.message}\n\n💡 Please try again with different text.`
    }, { quoted: msg });
  }
});

export const arrowtattoo = horla({
  nomCom: "arrowtattoo",
  categorie: "Tattoo",
  reaction: "🏹"
}, async (msg, { sock, args }) => {
  const from = msg.key.remoteJid;
  const userName = msg.pushName || "User";

  if (!args || args.length === 0) {
    await sock.sendMessage(from, {
      text: `*Example, ${userName}: * .arrowtattoo ${userName}`
    }, { quoted: msg });
    return;
  }

  try {
    await sock.sendMessage(from, {
      text: "*Creating arrow tattoo effect...*"
    }, { quoted: msg });

    const text = Array.isArray(args) ? args.join(' ') : args.toString();
    const anu = await mumaker.textpro("https://en.ephoto360.com/arrow-tattoo-effect-with-signature-712.html", text);

    await sock.sendMessage(from, {
      image: { url: anu.image },
      caption: "*Arrow Tattoo by ECLIPSE MD*"
    }, { quoted: msg });

  } catch (e) {
    console.error('[ARROWTATTOO] Error:', e);
    await sock.sendMessage(from, {
      text: `❌ *Error creating arrow tattoo*\n\n${e.message}\n\n💡 Please try again with different text.`
    }, { quoted: msg });
  }
});

export default { tattoo, arrowtattoo };
