import fs from 'fs';
import path from 'path';

const ANTICALL_PATH = path.join(process.cwd(), 'data', 'anticall.json');

function readState() {
    try {
        if (!fs.existsSync(ANTICALL_PATH)) return { enabled: false };
        const raw = fs.readFileSync(ANTICALL_PATH, 'utf8');
        const data = JSON.parse(raw || '{}');
        return { enabled: !!data.enabled };
    } catch {
        return { enabled: false };
    }
}

function writeState(enabled) {
    try {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(ANTICALL_PATH, JSON.stringify({ enabled: !!enabled }, null, 2));
    } catch (err) {
        console.error('[ANTICALL] Error writing state:', err);
    }
}

export default {
    name: 'anticall',
    description: 'Auto-reject and block incoming calls (self mode only)',
    aliases: [],
    async execute(msg, { sock, args, settings }) {
        const from = msg.key.remoteJid;
        
        if (!msg.key.fromMe) {
            return await sock.sendMessage(from, {
                text: '❌ This is a self mode command. Only accessible when using your own account.'
            }, { quoted: msg });
        }

        const state = readState();
        const sub = (args[0] || '').trim().toLowerCase();

        if (!sub || (sub !== 'on' && sub !== 'off' && sub !== 'status')) {
            await sock.sendMessage(from, { 
                text: `📵 *ANTICALL CONFIGURATION*

📊 **Current Status:** ${state.enabled ? '✅ Enabled' : '❌ Disabled'}

**Commands:**
• \`${settings.prefix}anticall on\` - Enable auto-block on incoming calls
• \`${settings.prefix}anticall off\` - Disable anticall
• \`${settings.prefix}anticall status\` - Show current status

**Features:**
• Automatically rejects all incoming calls
• Blocks caller after rejection
• Protects from spam calls`
            }, { quoted: msg });
            return;
        }

        if (sub === 'status') {
            await sock.sendMessage(from, { 
                text: `📊 *ANTICALL STATUS*\n\n🔄 Anticall is currently *${state.enabled ? 'ENABLED ✅' : 'DISABLED ❌'}*.` 
            }, { quoted: msg });
            return;
        }

        const enable = sub === 'on';
        writeState(enable);
        await sock.sendMessage(from, { 
            text: `✅ Anticall is now *${enable ? 'ENABLED' : 'DISABLED'}*.\n\n${enable ? '📵 All incoming calls will be automatically rejected and blocked.' : '📞 Incoming calls will work normally.'}` 
        }, { quoted: msg });
    }
};

export { readState };
