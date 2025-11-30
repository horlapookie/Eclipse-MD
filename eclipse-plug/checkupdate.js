import { exec } from "child_process";
import util from "util";
import axios from "axios";
import config from '../config.js';

const execAsync = util.promisify(exec);

export default {
  name: 'checkupdate',
  description: 'Check for bot updates on GitHub',
  aliases: ['checkupdates', 'updates', 'version'],
  async execute(msg, { sock, settings }) {
    const from = msg.key.remoteJid;
    const prefix = settings?.prefix || '.';

    try {
      await sock.sendMessage(from, {
        text: '🔍 *Checking for updates...*\n\n⏳ Fetching latest commit from GitHub...'
      }, { quoted: msg });

      const repoOwner = 'horlapookie';
      const repoName = 'Horlapookie-bot';
      const branch = 'main';

      // Get latest commit from GitHub API
      const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/commits/${branch}`;
      const response = await axios.get(apiUrl);
      const latestCommit = response.data;

      const latestSha = latestCommit.sha.substring(0, 7);
      const latestMessage = latestCommit.commit.message;
      const latestAuthor = latestCommit.commit.author.name;
      const latestDate = new Date(latestCommit.commit.author.date);
      
      // Format date
      const dateStr = latestDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const timeStr = latestDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Try to get current local commit
      let currentSha = 'unknown';
      let isUpToDate = false;
      let localCommitInfo = '';

      try {
        const { stdout: gitSha } = await execAsync('git rev-parse HEAD');
        currentSha = gitSha.trim().substring(0, 7);

        const { stdout: gitMessage } = await execAsync('git log -1 --pretty=%B');
        const { stdout: gitDate } = await execAsync('git log -1 --pretty=%ai');
        
        const localDate = new Date(gitDate.trim());
        const localDateStr = localDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        const localTimeStr = localDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });

        localCommitInfo = `📍 *Current Version:*
┃ Commit: \`${currentSha}\`
┃ Message: ${gitMessage.trim()}
┃ Date: ${localDateStr} at ${localTimeStr}

`;

        isUpToDate = (currentSha === latestSha);

      } catch (gitError) {
        console.log('[CHECKUPDATE] Could not get local git info:', gitError.message);
        localCommitInfo = `📍 *Current Version:*
┃ Unknown (git not initialized)

`;
      }

      if (isUpToDate) {
        await sock.sendMessage(from, {
          text: `✅ *BOT IS UP TO DATE!*

${localCommitInfo}🌟 *Latest on GitHub:*
┃ Commit: \`${latestSha}\`
┃ Message: ${latestMessage}
┃ Author: ${latestAuthor}
┃ Date: ${dateStr} at ${timeStr}

🎉 You're running the latest version!
📋 No update needed.`
        }, { quoted: msg });

      } else {
        await sock.sendMessage(from, {
          text: `🆕 *NEW UPDATE AVAILABLE!*

${localCommitInfo}🌟 *Latest on GitHub:*
┃ Commit: \`${latestSha}\`
┃ Message: ${latestMessage}
┃ Author: ${latestAuthor}
┃ Date: ${dateStr} at ${timeStr}

💡 *To update, use:*
${prefix}update

⚠️ This will:
• Download latest code
• Update dependencies
• Preserve your settings & data`
        }, { quoted: msg });
      }

    } catch (error) {
      console.error('[CHECKUPDATE] Error:', error);
      
      await sock.sendMessage(from, {
        text: `❌ *Failed to check for updates*

🚫 Error: ${error.message}

💡 Possible causes:
• Internet connection issue
• GitHub API rate limit
• Repository not accessible

🔗 Repository: github.com/horlapookie/Horlapookie-bot
🤖 Bot: ${config.botName}

Try again in a few minutes.`
      }, { quoted: msg });
    }
  }
};
