export default {
  name: 'suno',
  description: 'Generate music with Suno AI',
  aliases: ['music', 'generate-music', 'sunoai'],
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const prompt = args.join(' ');
    
    if (!prompt) {
      return await sock.sendMessage(from, {
        text: `❓ Please provide a music prompt!\n\nUsage:\n• ${settings.prefix}suno <music description>\n\nExample: ${settings.prefix}suno upbeat electronic dance music with deep bass`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, {
        text: `🎵 *Suno AI* is generating your music... Please wait! (This may take 1-2 minutes)`
      }, { quoted: msg });

      const response = await fetch('https://apis.prexzyvilla.site/ai/suno', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === true && data.data) {
        const musicUrl = data.data.music_url || data.data.url || data.data;
        
        if (musicUrl && typeof musicUrl === 'string' && musicUrl.startsWith('http')) {
          await sock.sendMessage(from, {
            audio: { url: musicUrl },
            ptt: false,
            mimetype: 'audio/mpeg',
            caption: `🎵 *Suno AI Music*\n\n📝 *Prompt:* ${prompt}`
          }, { quoted: msg });
        } else {
          throw new Error('Invalid music URL received');
        }
      } else {
        throw new Error('No music generated');
      }
    } catch (error) {
      console.error('[SUNO] Error:', error.message);
      await sock.sendMessage(from, {
        text: `❌ ${error.message || 'Suno AI is currently unavailable. Please try again later.'}`
      }, { quoted: msg });
    }
  }
};
