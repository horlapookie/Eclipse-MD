import { analyzeImageWithVision } from '../lib/myfunc1.js';
import fs from 'fs';
import path from 'path';

const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

export default {
  name: 'vision',
  aliases: ['describe', 'analyze'],
  description: 'Analyze and describe an image using Gemini AI vision',
  category: 'AI Image Generator',

  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!msg.message?.imageMessage && !quotedMsg?.imageMessage) {
      return await sock.sendMessage(from, {
        text: `${emojis.ai} *GEMINI AI Vision*\n\n🖼️ *Reply to an image to analyze it.*\n\n*Usage:*\n• Reply to image + ?vision\n• Reply to image + ?vision <custom prompt>\n\n*Examples:*\n• ?vision - Default description\n• ?vision what is in this image?\n• ?vision describe in detail\n• ?analyze translate any text in this image`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, {
        react: { text: emojis.processing, key: msg.key }
      });

      await sock.sendMessage(from, {
        text: `${emojis.ai} *Analyzing image with Gemini AI...*\n\n⏳ Processing your request...`
      }, { quoted: msg });

      const imageMessage = msg.message?.imageMessage || quotedMsg?.imageMessage;
      const prompt = args.length ? args.join(' ') : 'Describe this image in detail.';

      const result = await analyzeImageWithVision(imageMessage, prompt);

      if (!result.success) {
        let errorMessage = `${emojis.error} *Failed to analyze image*\n\n`;
        
        if (result.error.includes('API key')) {
          errorMessage += '🔑 Invalid or missing API key. Please set geminiApiKey in settings.js.\n\n📝 Get your free API key at:\nhttps://makersuite.google.com/app/apikey';
        } else if (result.error.includes('quota')) {
          errorMessage += '📊 API quota exceeded. Please try again later.';
        } else if (result.error.includes('timeout')) {
          errorMessage += '⏰ Request timed out. Please try again.';
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
        text: `${emojis.success} *Image Analysis Result:*\n\n${result.description}\n\n> Powered by Gemini AI`
      }, { quoted: msg });

      await sock.sendMessage(from, {
        react: { text: emojis.success, key: msg.key }
      });

    } catch (err) {
      console.error('Vision command error:', err);
      
      await sock.sendMessage(from, {
        text: `${emojis.error} *Unexpected error occurred*\n\n🛠️ ${err.message}`
      }, { quoted: msg });

      await sock.sendMessage(from, {
        react: { text: emojis.error, key: msg.key }
      });
    }
  }
};
