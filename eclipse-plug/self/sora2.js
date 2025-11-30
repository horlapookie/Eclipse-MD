import { createSora2Video, waitForSora2Completion } from '../../lib/soraVideoAPI.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default {
  name: 'sora2',
  description: 'Generate AI videos using Sora-2 model',
  category: 'Video Generator',
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const prefix = settings.prefix || '.';
    
    try {
      if (!args || args.length === 0) {
        return await sock.sendMessage(from, { 
          text: `*🎬 Sora-2 Video Generator*\n\n⚠️ *Service Status:* The Sora-2 API is currently experiencing issues with the upstream provider.\n\nGenerate AI videos from text prompts!\n\n*Usage:*\n${prefix}sora2 <prompt>\n\n*Example:*\n${prefix}sora2 A cat walking on the beach at sunset\n${prefix}sora2 Ocean waves crashing on rocks\n\n*Note:*\n• The API wrapper is working but the underlying Sora-2 service returns 404 errors\n• Please try again later or contact the API provider\n• Alternative: Use ${prefix}sora command for video generation`
        }, { quoted: msg });
      }

      const fullText = args.join(' ');
      const parts = fullText.split('|').map(p => p.trim());
      
      const prompt = parts[0];
      let imageUrl = parts[1] || null;

      if (!imageUrl && msg.message?.imageMessage) {
        try {
          const buffer = await sock.downloadMediaMessage(msg.message.imageMessage);
          const tempImagePath = path.join(process.cwd(), 'data', `temp_${Date.now()}.jpg`);
          fs.writeFileSync(tempImagePath, buffer);
          imageUrl = tempImagePath;
        } catch (imgErr) {
          console.log('Image download failed:', imgErr.message);
        }
      }

      if (prompt.length < 10) {
        return await sock.sendMessage(from, { 
          text: '❌ Prompt too short! Please provide at least 10 characters.' 
        }, { quoted: msg });
      }

      await sock.sendMessage(from, { 
        text: `🎬 *Attempting to create Sora-2 video...*\n\nPrompt: ${prompt}\n${imageUrl ? 'Image: Provided\n' : ''}\n_Connecting to API..._` 
      }, { quoted: msg });

      const createResult = await createSora2Video(prompt, imageUrl);

      if (!createResult.success) {
        return await sock.sendMessage(from, { 
          text: `❌ *Sora-2 Video Generation Failed*\n\n*Error:* ${createResult.error}\n\n*Reason:* The Sora-2 underlying service is currently unavailable (returns 404). The API wrapper is working correctly but cannot reach the video generation service.\n\n*Alternative:* Try using ${prefix}sora instead, which uses a different video generation API.` 
        }, { quoted: msg });
      }

      // Check if we got a direct video URL
      if (createResult.direct && createResult.videoUrl) {
        await sock.sendMessage(from, { 
          text: `✅ *Video generated!*\n\n_Downloading and sending..._` 
        }, { quoted: msg });

        try {
          const videoResponse = await axios.get(createResult.videoUrl, {
            responseType: 'arraybuffer',
            timeout: 120000
          });

          const tempVideoPath = path.join(process.cwd(), 'data', `sora2_${Date.now()}.mp4`);
          fs.writeFileSync(tempVideoPath, videoResponse.data);

          await sock.sendMessage(from, {
            video: { url: tempVideoPath },
            mimetype: 'video/mp4',
            caption: `🎬 *Sora-2 Generated Video*\n\n${prompt}`
          }, { quoted: msg });

          fs.unlinkSync(tempVideoPath);
          return;
        } catch (downloadErr) {
          console.error('Video download error:', downloadErr);
          await sock.sendMessage(from, { 
            text: `✅ Video generated!\n\n*Video URL:* ${createResult.videoUrl}\n\n_Download failed, please use the URL directly_` 
          }, { quoted: msg });
          return;
        }
      }

      // If we got a task ID, wait for completion
      await sock.sendMessage(from, { 
        text: `⏳ *Video generation started*\n\nTask ID: ${createResult.taskId}\n\n_Waiting for completion (this takes 2-5 minutes)..._` 
      }, { quoted: msg });

      const finalResult = await waitForSora2Completion(createResult.taskId);

      if (!finalResult.success) {
        return await sock.sendMessage(from, { 
          text: `❌ *Video generation failed*\n\n${finalResult.error}\n\n*Try:* ${prefix}sora for alternative video generation` 
        }, { quoted: msg });
      }

      await sock.sendMessage(from, { 
        text: `✅ *Video generated successfully!*\n\n_Downloading and sending..._` 
      }, { quoted: msg });

      try {
        const videoResponse = await axios.get(finalResult.videoUrl, {
          responseType: 'arraybuffer',
          timeout: 120000
        });

        const tempVideoPath = path.join(process.cwd(), 'data', `sora2_${Date.now()}.mp4`);
        fs.writeFileSync(tempVideoPath, videoResponse.data);

        await sock.sendMessage(from, {
          video: { url: tempVideoPath },
          mimetype: 'video/mp4',
          caption: `🎬 *Sora-2 Generated Video*\n\n${prompt}`
        }, { quoted: msg });

        fs.unlinkSync(tempVideoPath);
      } catch (downloadErr) {
        console.error('Video download error:', downloadErr);
        await sock.sendMessage(from, { 
          text: `✅ Video generated!\n\n*Video URL:* ${finalResult.videoUrl}\n\n_Download failed, please use the URL directly_` 
        }, { quoted: msg });
      }
    } catch (err) {
      console.error('Sora-2 error:', err);
      await sock.sendMessage(from, { 
        text: `❌ An error occurred:\n${err.message}\n\n*Alternative:* Try ${prefix}sora command instead.` 
      }, { quoted: msg });
    }
  }
};
