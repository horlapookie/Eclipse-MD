import fs from 'fs';
import path from 'path';

const TEMP_MEDIA_DIR = path.join(process.cwd(), 'tmp');

const getFolderSizeInMB = (folderPath) => {
    try {
        if (!fs.existsSync(folderPath)) return 0;
        
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        }

        return totalSize / (1024 * 1024);
    } catch (err) {
        console.error('Error getting folder size:', err);
        return 0;
    }
};

const getFileCount = (folderPath) => {
    try {
        if (!fs.existsSync(folderPath)) return 0;
        
        const files = fs.readdirSync(folderPath);
        return files.filter(file => {
            const filePath = path.join(folderPath, file);
            return fs.statSync(filePath).isFile();
        }).length;
    } catch (err) {
        return 0;
    }
};

export default {
    name: 'cleartmp',
    description: 'Clear temporary media files from antidelete storage (self mode only)',
    aliases: ['cleartmp', 'cleartemp'],
    async execute(msg, { sock, args, isOwner, settings }) {
        const from = msg.key.remoteJid;

        if (!msg.key.fromMe && !isOwner) {
            return await sock.sendMessage(from, {
                text: '❌ This is a self mode command. Only accessible to the bot owner.'
            }, { quoted: msg });
        }

        try {
            // Get stats before cleanup
            const sizeBefore = getFolderSizeInMB(TEMP_MEDIA_DIR);
            const filesBefore = getFileCount(TEMP_MEDIA_DIR);

            if (filesBefore === 0) {
                return await sock.sendMessage(from, {
                    text: '✅ *TMP folder is already empty!*\n\n📁 No files to delete.'
                }, { quoted: msg });
            }

            // Create tmp directory if it doesn't exist
            if (!fs.existsSync(TEMP_MEDIA_DIR)) {
                fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
            }

            // Delete all files in tmp directory
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            let deletedCount = 0;
            let failedCount = 0;

            for (const file of files) {
                const filePath = path.join(TEMP_MEDIA_DIR, file);
                try {
                    if (fs.statSync(filePath).isFile()) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    }
                } catch (err) {
                    failedCount++;
                    console.error(`Failed to delete ${file}:`, err.message);
                }
            }

            const response = `✅ *TMP folder cleaned successfully!*

📊 *Cleanup Report:*
🗑️ Files Deleted: ${deletedCount}
${failedCount > 0 ? `⚠️ Failed: ${failedCount}\n` : ''}💾 Space Freed: ${sizeBefore.toFixed(2)} MB

📁 Folder: /tmp
🔄 Status: Clean`;

            await sock.sendMessage(from, {
                text: response
            }, { quoted: msg });

        } catch (error) {
            console.error('[CLEARTMP] Error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error clearing tmp folder!*\n\n🚫 ${error.message}`
            }, { quoted: msg });
        }
    }
};
