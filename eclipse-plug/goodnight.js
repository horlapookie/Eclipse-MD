import axios from 'axios';
import config from '../config.js';

export default {
    name: 'goodnight',
    description: 'Send goodnight message with sweet quotes',
    aliases: ['gn', 'night'],
    async execute(msg, { sock, args, settings }) {
        const from = msg.key.remoteJid;
        
        try {
            // Try to fetch a goodnight message from API
            let goodnightMessage = '';
            
            try {
                const res = await axios.get('https://shizoapi.onrender.com/api/texts/lovenight?apikey=shizo');
                if (res.data && res.data.result) {
                    goodnightMessage = res.data.result;
                }
            } catch (apiError) {
                console.log('[GOODNIGHT] API failed, using default messages');
            }
            
            // Fallback to default messages if API fails
            if (!goodnightMessage) {
                const defaultMessages = [
                    '🌙 *Good Night!* 🌙\n\nMay your dreams be filled with peace and happiness. Sleep tight! 💤',
                    '✨ *Sweet Dreams!* ✨\n\nAs the stars light up the night sky, may your dreams be just as bright. Good night! 🌟',
                    '🌃 *Good Night!* 🌃\n\nRest well and recharge for tomorrow. You deserve the best sleep! 😴',
                    '💫 *Sleep Tight!* 💫\n\nLet go of today\'s worries and embrace the calm of the night. Good night! 🌙',
                    '🌠 *Good Night!* 🌠\n\nMay the night bring you rest and the morning bring you joy. Sweet dreams! 💖'
                ];
                goodnightMessage = defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
            }
            
            await sock.sendMessage(from, { 
                text: goodnightMessage 
            }, { quoted: msg });
            
        } catch (error) {
            console.error('[GOODNIGHT] Error:', error);
            await sock.sendMessage(from, { 
                text: '❌ Failed to send goodnight message. Please try again!' 
            }, { quoted: msg });
        }
    }
};
