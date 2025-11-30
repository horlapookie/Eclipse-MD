import { generateTextToVideo } from '../../lib/myfunc1.js';
import fs from 'fs';
import path from 'path';

const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

export default {
  name: 'sora',
  aliases: ['txt2video', 'textvideo', 'videogen'],
  description: 'Generate video from text description using AI',
  category: 'AI Video Generator',
  self: true,

  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;

    if (!args || args.length === 0) {
      return await sock.sendMessage(from, {
        text: `${emojis.ai} *SORA AI - Text to Video Generator*\n\n🎬 *Generate videos from text descriptions*\n\n*Usage:*\n• ${global.COMMAND_PREFIX || '.'}sora <description>\n\n*Examples:*\n• ${global.COMMAND_PREFIX || '.'}sora man dancing in the rain\n• ${global.COMMAND_PREFIX || '.'}sora sunset over ocean waves\n• ${global.COMMAND_PREFIX || '.'}txt2video cat playing with yarn\n\n⚡ Powered by Sora AI`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, {
        react: { text: emojis.processing, key: msg.key }
      });

      await sock.sendMessage(from, {
        text: `${emojis.ai} *Generating video with Sora AI...*\n\n🎬 Processing: "${args.join(' ')}"\n⏳ This may take a moment...`
      }, { quoted: msg });

      const prompt = args.join(' ');
      const result = await generateTextToVideo(prompt);

      if (!result.success) {
        let errorMessage = `${emojis.error} *Failed to generate video*\n\n`;
        
        if (result.error.includes('timeout')) {
          errorMessage += '⏰ Request timed out. The AI service might be busy. Please try again.';
        } else if (result.error.includes('ECONNREFUSED') || result.error.includes('ENOTFOUND')) {
          errorMessage += '🌐 Cannot connect to API service. Please check your internet connection.';
        } else {
          errorMessage += `🛠️ Error: ${result.error}`;
        }
        
        await sock.sendMessage(from, {
          text: errorMessage
        }, { quoted: msg });

        return await sock.sendMessage(from, {
          react: { text: emojis.error, key: msg.key }
        });
      }

      await sock.sendMessage(from, {
        video: { url: result.videoUrl },
        caption: `${emojis.success} *Video Generated Successfully!*\n\n📝 Prompt: ${result.prompt}\n\n> Powered by Sora AI`,
        mimetype: 'video/mp4'
      }, { quoted: msg });

      await sock.sendMessage(from, {
        react: { text: emojis.success, key: msg.key }
      });

    } catch (err) {
      console.error('Sora command error:', err);
      
      await sock.sendMessage(from, {
        text: `${emojis.error} *Unexpected error occurred*\n\n🛠️ ${err.message}\n\nPlease try again later.`
      }, { quoted: msg });

      await sock.sendMessage(from, {
        react: { text: emojis.error, key: msg.key }
      });
    }
  }
};
