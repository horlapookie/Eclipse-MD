import axios from 'axios';
import config from '../config.js';

export default {
    name: 'goodmorning',
    description: 'Send good morning message with motivational quotes',
    aliases: ['gm', 'morning'],
    async execute(msg, { sock, args, settings }) {
        const from = msg.key.remoteJid;
        
        try {
            // Try to fetch a good morning message from API
            let morningMessage = '';
            
            try {
                const res = await axios.get('https://shizoapi.onrender.com/api/texts/goodmorning?apikey=shizo');
                if (res.data && res.data.result) {
                    morningMessage = res.data.result;
                }
            } catch (apiError) {
                console.log('[GOODMORNING] API failed, using default messages');
            }
            
            // Fallback to default messages if API fails
            if (!morningMessage) {
                const defaultMessages = [
                    '☀️ *Good Morning!* ☀️\n\nRise and shine! Today is a new day full of possibilities. Make it amazing! 🌅',
                    '🌄 *Good Morning!* 🌄\n\nEvery morning is a fresh start. Embrace it with a smile and positive energy! 😊',
                    '🌞 *Rise and Shine!* 🌞\n\nA new day means new opportunities. Go out there and make the most of it! 💪',
                    '🌻 *Good Morning!* 🌻\n\nStart your day with gratitude and watch how beautiful it becomes. Have a blessed day! 🙏',
                    '🌈 *Good Morning!* 🌈\n\nBelieve in yourself and all that you are. Today is your day to shine! ✨'
                ];
                morningMessage = defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
            }
            
            await sock.sendMessage(from, { 
                text: morningMessage 
            }, { quoted: msg });
            
        } catch (error) {
            console.error('[GOODMORNING] Error:', error);
            await sock.sendMessage(from, { 
                text: '❌ Failed to send good morning message. Please try again!' 
            }, { quoted: msg });
        }
    }
};
