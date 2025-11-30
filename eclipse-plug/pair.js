import axios from 'axios';

const PAIRING_SITE_URL = 'https://eclipse-session.onrender.com/code';

export default {
  name: 'pair',
  description: 'Generate WhatsApp pairing code',
  category: 'Utility',
  aliases: ['getcode', 'paircode'],
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const prefix = settings.prefix || '.';
    
    if (!args[0]) {
      return await sock.sendMessage(from, {
        text: `*📱 WhatsApp Pairing Code Generator*\n\nGenerate a pairing code to link your WhatsApp!\n\n*Usage:*\n${prefix}pair <phone_number>\n\n*Example:*\n${prefix}pair 2347055517860\n\n*Instructions:*\n• Include country code (e.g., 234 for Nigeria)\n• No spaces or special characters\n• Just numbers only\n\n*Note:* After getting the code:\n1. Open WhatsApp on your phone\n2. Go to Settings > Linked Devices\n3. Tap "Link a Device"\n4. Enter the 8-digit code\n\n_Powered by Eclipse MD_`
      }, { quoted: msg });
    }

    const phoneNumber = args[0].replace(/[^0-9]/g, '');
    
    if (phoneNumber.length < 10) {
      return await sock.sendMessage(from, {
        text: `❌ *Invalid phone number!*\n\nPlease provide a valid phone number with country code.\n\n*Example:*\n${prefix}pair 2347055517860`
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, {
        text: '⏳ *Generating pairing code...*\n\nPlease wait, this may take a few seconds...'
      }, { quoted: msg });

      const response = await axios.get(`${PAIRING_SITE_URL}?number=${phoneNumber}`, {
        timeout: 90000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (response.data && response.data.code) {
        const pairingCode = response.data.code;
        
        const successMessage = `✅ *Pairing Code Generated Successfully!*

*Phone Number:* +${phoneNumber}
*Pairing Code:* \`${pairingCode}\`

*📱 How to use this code:*

1️⃣ Open WhatsApp on your phone
2️⃣ Go to *Settings* > *Linked Devices*
3️⃣ Tap *"Link a Device"*
4️⃣ Enter this code: \`${pairingCode}\`

⚠️ *Important Notes:*
• Code expires in 20 seconds
• Keep this code private
• Only use on your own device
• You'll receive your SESSION-ID via WhatsApp

_Powered by Eclipse MD_`;

        await sock.sendMessage(from, {
          text: successMessage
        }, { quoted: msg });

      } else {
        throw new Error('Invalid response from pairing service');
      }

    } catch (error) {
      console.error('Pairing error:', error);
      
      let errorMessage = '❌ *Failed to generate pairing code*\n\n';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage += '⏰ *Timeout Error*\nThe pairing service took too long to respond. This might be because the service is starting up (Render free tier cold start).\n\n*Please try again in 30-60 seconds.*';
      } else if (error.response?.status === 503 || error.code === 'ECONNREFUSED') {
        errorMessage += '🔄 *Service Unavailable*\nThe pairing service is currently starting up or unavailable.\n\n*Please wait 30-60 seconds and try again.*';
      } else {
        errorMessage += `📝 *Error:* ${error.message}\n\n*Please try again or contact support.*`;
      }

      await sock.sendMessage(from, {
        text: errorMessage
      }, { quoted: msg });
    }
  }
};
