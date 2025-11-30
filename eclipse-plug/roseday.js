import axios from 'axios';
import fs from 'fs';
import path from 'path';

const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

export default {
  name: 'roseday',
  aliases: ['rose', 'roseday-msg'],
  description: 'Get romantic Rose Day messages',
  category: 'Entertainment',

  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;

    try {
      await sock.sendMessage(from, {
        react: { text: '🌹', key: msg.key }
      });

      let data;
      try {
        const response = await axios.get('https://shizoapi.onrender.com/api/texts/roseday?apikey=shizo', {
          timeout: 15000
        });
        data = response.data;
      } catch (apiError) {
        // Fallback messages if API is down
        const fallbackMessages = [
          "A rose speaks of love silently, in a language known only to the heart. 🌹",
          "Red roses for a red love. You're the love of my life! 🌹❤️",
          "Flowers are the sweetest things that God ever made and forgot to put a soul into. 🌹",
          "A single rose can be my garden... a single friend, my world. 🌹",
          "I'd rather have roses on my table than diamonds on my neck. 🌹💎"
        ];
        data = { result: fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)] };
      }

      if (!data || !data.result) {
        throw new Error('Invalid response from API');
      }

      const roseDayText = `🌹 *Happy Rose Day* 🌹\n\n${data.result}\n\n━━━━━━━━━━━━━━━━━━\n💖 _Spread love with Eclipse MD_`;

      await sock.sendMessage(from, {
        text: roseDayText
      }, { quoted: msg });

      await sock.sendMessage(from, {
        react: { text: emojis.success || '✅', key: msg.key }
      });

    } catch (error) {
      console.error('Error in roseday command:', error);
      
      await sock.sendMessage(from, {
        react: { text: emojis.error || '❌', key: msg.key }
      });

      await sock.sendMessage(from, {
        text: `${emojis.error || '❌'} Failed to fetch Rose Day message. Please try again later.\n\n🛠️ Error: ${error.message}`
      }, { quoted: msg });
    }
  }
};
