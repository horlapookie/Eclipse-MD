import { runShellCommand, formatShellOutput, isSafeCommand } from '../lib/shellRunner.js';

export default {
  name: 'shell',
  description: 'Execute shell commands (use with $ prefix)',
  category: 'Shell Commands',
  async execute(msg, { sock, args, settings, isOwner }) {
    const from = msg.key.remoteJid;
    const prefix = settings.prefix || '.';
    
    try {
      if (!isOwner) {
        return await sock.sendMessage(from, { 
          text: '🚫 *Access Denied*\n\nShell commands are restricted to the bot owner only for security reasons.' 
        }, { quoted: msg });
      }

      if (!args || args.length === 0) {
        return await sock.sendMessage(from, { 
          text: `*🐚 Shell Command Runner*\n\nExecute shell/terminal commands directly!\n\n*Usage:*\n$<command>\n\n*Examples:*\n$ls -la\n$pwd\n$whoami\n$date\n$df -h\n$free -m\n\n*Note:* Dangerous commands are blocked for safety.\n\n_You can also use:_ ${prefix}shell <command>`
        }, { quoted: msg });
      }

      const command = args.join(' ');

      if (!isSafeCommand(command)) {
        return await sock.sendMessage(from, { 
          text: '🚫 *Command Blocked*\n\nThis command is potentially dangerous and has been blocked for safety reasons.' 
        }, { quoted: msg });
      }

      await sock.sendMessage(from, { 
        text: `⏳ Executing command...\n\`${command}\`` 
      }, { quoted: msg });

      const result = await runShellCommand(command);
      const output = formatShellOutput(result, command);

      const maxLength = 4000;
      if (output.length > maxLength) {
        const truncated = output.substring(0, maxLength);
        await sock.sendMessage(from, { 
          text: truncated + '\n\n_...output truncated (too long)_' 
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { 
          text: output 
        }, { quoted: msg });
      }
    } catch (err) {
      console.error('Shell command error:', err);
      await sock.sendMessage(from, { 
        text: `❌ An error occurred:\n${err.message}` 
      }, { quoted: msg });
    }
  }
};
