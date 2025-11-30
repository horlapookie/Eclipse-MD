import axios from 'axios';
import fs from 'fs';
import path from 'path';

const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

export default {
  name: "blowjob",
  description: "Sends random NSFW blowjob images as carousel (group only).",
  category: "NSFW",

  async execute(msg, { sock }) {
    const dest = msg.key.remoteJid;
    const isGroup = dest.endsWith('@g.us');

    if (!isGroup) {
      await sock.sendMessage(dest, {
        text: `${emojis.error} This command can only be used in group chats.`,
      }, { quoted: msg });
      return;
    }

    const url = 'https://api.waifu.pics/nsfw/blowjob';

    try {
      await sock.sendMessage(dest, {
        react: { text: emojis.processing, key: msg.key }
      });

      // Fetch 5 image URLs
      const imagePromises = [];
      for (let i = 0; i < 5; i++) {
        imagePromises.push(axios.get(url));
      }

      const responses = await Promise.all(imagePromises);
      const imageUrls = responses.map(response => response.data.url);

      // Create carousel message array
      const mediaMessages = imageUrls.map(imageUrl => ({
        image: { url: imageUrl }
      }));

      // Send as carousel
      try {
        await sock.sendMessage(dest, { 
          mediaGroup: mediaMessages 
        }, { quoted: msg });
        
        await sock.sendMessage(dest, {
          react: { text: emojis.success, key: msg.key }
        });
      } catch (carouselError) {
        console.error('[BLOWJOB] Carousel failed, sending individually:', carouselError.message);
        
        // Fallback: send one by one
        for (const imageUrl of imageUrls) {
          await sock.sendMessage(dest, {
            image: { url: imageUrl }
          }, { quoted: msg });
        }

        await sock.sendMessage(dest, {
          react: { text: emojis.success, key: msg.key }
        });
      }

    } catch (error) {
      console.error('[BLOWJOB] Error:', error);
      await sock.sendMessage(dest, {
        text: `${emojis.error} Failed to fetch blowjob images.\n\nError: ${error.message}`,
      }, { quoted: msg });
      
      await sock.sendMessage(dest, {
        react: { text: emojis.error, key: msg.key }
      });
    }
  }
};
