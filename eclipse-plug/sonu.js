import { generateSonuMusic, formatSonuResponse } from '../lib/sonuMusicAPI.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default {
  name: 'sonu',
  description: 'Generate AI music from custom lyrics using Sonu AI',
  category: 'Music Generator',
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const prefix = settings.prefix || '.';
    
    try {
      if (!args || args.length === 0) {
        return await sock.sendMessage(from, { 
          text: `*🎵 Sonu Music Generator*\n\nGenerate AI music from your custom lyrics!\n\n*Usage:*\n${prefix}sonu <lyrics>\n${prefix}sonu <lyrics> | <style> | <instrument>\n\n*Example:*\n${prefix}sonu I love you forever\n${prefix}sonu Walking in the rain | pop | piano\n\n*Styles:* pop, rock, jazz, classical, etc.\n*Instruments:* piano, guitar, drums, etc.`
        }, { quoted: msg });
      }

      const fullText = args.join(' ');
      const parts = fullText.split('|').map(p => p.trim());
      
      const lyrics = parts[0];
      const style = parts[1] || '';
      const instrument = parts[2] || '';

      if (lyrics.length < 5) {
        return await sock.sendMessage(from, { 
          text: '❌ Lyrics too short! Please provide at least 5 characters.' 
        }, { quoted: msg });
      }

      await sock.sendMessage(from, { 
        text: `🎵 *Generating AI music...*\n\nLyrics: ${lyrics}\n${style ? `Style: ${style}\n` : ''}${instrument ? `Instrument: ${instrument}\n` : ''}\n_This may take 1-2 minutes. Please wait..._` 
      }, { quoted: msg });

      const result = await generateSonuMusic(lyrics, style, instrument);

      if (!result.success) {
        return await sock.sendMessage(from, { 
          text: `❌ *Music Generation Failed*\n\n${result.error}\n\n*Tip:* Try simpler lyrics or different style/instrument combinations.` 
        }, { quoted: msg });
      }

      await sock.sendMessage(from, { 
        text: `✅ *AI Music Generated Successfully!*\n\n*Title:* ${result.title}\n\n_Sending audio file(s)..._` 
      }, { quoted: msg });

      if (result.success && result.audioUrl) {
        try {
          const audioResponse = await axios.get(result.audioUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
          });

          const tempFile = path.join(process.cwd(), 'data', `sonu_${Date.now()}.mp3`);
          fs.writeFileSync(tempFile, audioResponse.data);

          await sock.sendMessage(from, {
            audio: { url: tempFile },
            mimetype: 'audio/mpeg',
            fileName: `${result.title}.mp3`
          }, { quoted: msg });

          fs.unlinkSync(tempFile);

          if (result.coverUrl) {
            try {
              await sock.sendMessage(from, {
                image: { url: result.coverUrl },
                caption: `🎨 *Cover Art*\n\n${result.title}`
              }, { quoted: msg });
            } catch (coverErr) {
              console.log('Cover art failed:', coverErr.message);
            }
          }
        } catch (downloadErr) {
          console.error('Audio download error:', downloadErr);
          await sock.sendMessage(from, { 
            text: `✅ Music generated!\n\n*Audio URL:* ${result.audioUrl}\n\n_Download failed, please use the URL directly_` 
          }, { quoted: msg });
        }
      }
    } catch (err) {
      console.error('Sonu music error:', err);
      await sock.sendMessage(from, { 
        text: `❌ An error occurred:\n${err.message}` 
      }, { quoted: msg });
    }
  }
};
