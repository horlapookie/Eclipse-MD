import axios from 'axios';
import fs from 'fs';
import path from 'path';

const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

export default {
  name: 'shayari',
  aliases: ['shayri', 'poetry'],
  description: 'Get random beautiful Shayari (Urdu/Hindi poetry)',
  category: 'Entertainment',

  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;

    try {
      await sock.sendMessage(from, {
        react: { text: emojis.processing || '⏳', key: msg.key }
      });

      const response = await axios.get('https://shizoapi.onrender.com/api/texts/shayari?apikey=shizo', {
        timeout: 15000
      });

      const data = response.data;

      if (!data || !data.result) {
        throw new Error('Invalid response from API');
      }

      const shayariText = `${emojis.heart || '💝'} *Beautiful Shayari* ${emojis.heart || '💝'}\n\n${data.result}\n\n━━━━━━━━━━━━━━━━━━\n💫 _Powered by Eclipse MD_`;

      await sock.sendMessage(from, {
        text: shayariText
      }, { quoted: msg });

      await sock.sendMessage(from, {
        react: { text: emojis.success || '✅', key: msg.key }
      });

    } catch (error) {
      console.error('Error in shayari command:', error);
      
      await sock.sendMessage(from, {
        react: { text: emojis.error || '❌', key: msg.key }
      });

      await sock.sendMessage(from, {
        text: `${emojis.error || '❌'} Failed to fetch shayari. Please try again later.\n\n🛠️ Error: ${error.message}`
      }, { quoted: msg });
    }
  }
};
