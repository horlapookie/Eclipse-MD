import yts from 'yt-search';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import ytdl from '@distube/ytdl-core';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { musicDownloader, alternativeSource, musicApi, logNetworkError } from '../lib/musicHelper.js';

// Load emojis
const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = util.promisify(exec);

let ytdlp;
try {
    const ytdlpModule = await import('yt-dlp-exec');
    ytdlp = ytdlpModule.default;
} catch (_) {
    ytdlp = null;
}

export default {
    name: 'play',
    description: 'Download and send music from YouTube as voice note',
    aliases: ['song', 'music'],
    category: 'Media',
    async execute(msg, { sock, args, settings }) {
        const chatId = msg.key.remoteJid;
        const start = Date.now();

        try {
            await sock.sendMessage(chatId, {
                react: { text: emojis.processing, key: msg.key }
            });

            const searchQuery = args.join(' ').trim();
            
            if (!searchQuery) {
                return await sock.sendMessage(chatId, {
                    text: `${emojis.error} *Music Player*\n\nWhat song would you like to download?\n\nExample: \`?play Shape of You\``,
                    react: { text: emojis.error, key: msg.key }
                }, { quoted: msg });
            }

            let videoUrl = '';
            let songTitle = '';
            
            if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
                videoUrl = searchQuery;
            } else {
                const { videos } = await yts(searchQuery);
                if (!videos || videos.length === 0) {
                    return await sock.sendMessage(chatId, {
                        text: `${emojis.error} No songs found for your search query!`,
                        react: { text: emojis.error, key: msg.key }
                    }, { quoted: msg });
                }
                videoUrl = videos[0].url;
                songTitle = videos[0].title || searchQuery;
            }

            try {
                const ytId = (musicDownloader.extractVideoId(videoUrl) || '').trim();
                const thumbUrl = ytId ? `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg` : undefined;
                const displayTitle = songTitle || searchQuery || 'Song';
                
                if (thumbUrl) {
                    await sock.sendMessage(chatId, {
                        image: { url: thumbUrl },
                        caption: `${emojis.music} *${displayTitle}*\n\n${emojis.processing} Processing your music request...`
                    }, { quoted: msg });
                }
            } catch (e) {
                console.error('[PLAY] Error sending preview:', e?.message || e);
            }

            let musicResult;
            try {
                console.log('[PLAY] Attempting musicDownloader API...');
                musicResult = await musicDownloader.downloadMusic(videoUrl, 'mp3');
                
                if (!musicResult || !musicResult.status || !musicResult.result?.download) {
                    throw new Error('MusicDownloader API failed');
                }
                
                console.log('[PLAY] MusicDownloader API success');
            } catch (err) {
                console.error(`[PLAY] MusicDownloader API failed:`, err?.message || err);
                
                try {
                    console.log('[PLAY] Trying princetechn API...');
                    const musicData = await musicApi.getMusicData(videoUrl);
                    if (musicData?.success && musicData?.result?.download_url) {
                        musicResult = {
                            status: true,
                            code: 200,
                            result: {
                                title: musicData.result.title,
                                type: 'audio',
                                format: 'm4a',
                                thumbnail: musicData.result.thumbnail,
                                download: musicData.result.download_url,
                                id: musicData.result.id,
                                quality: musicData.result.quality
                            }
                        };
                        console.log('[PLAY] Princetechn API success');
                    } else {
                        throw new Error('Princetechn API did not return download_url');
                    }
                } catch (apiErr) {
                    console.error(`[PLAY] Princetechn API failed:`, apiErr?.message || apiErr);
                }
                
                try {
                    const tempDir = path.join(__dirname, '../temp');
                    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
                    const tempFile = path.join(tempDir, `${Date.now()}.mp3`);

                    const ytHeaders = {
                        'cookie': 'VISITOR_INFO1_LIVE=; PREF=f1=50000000&tz=UTC; YSC=',
                        'user-agent': 'Mozilla/5.0'
                    };
                    const info = await ytdl.getInfo(videoUrl, { requestOptions: { headers: ytHeaders } });
                    await new Promise(async (resolve, reject) => {
                        const ffmpeg = (await import('fluent-ffmpeg')).default;
                        const stream = ytdl(videoUrl, {
                            quality: 'highestaudio',
                            filter: 'audioonly',
                            highWaterMark: 1 << 25,
                            requestOptions: { headers: ytHeaders }
                        });
                        stream.on('error', (e) => {
                            console.error('[PLAY] ytdl stream error:', e?.message || e);
                        });
                        ffmpeg(stream)
                            .audioBitrate(128)
                            .toFormat('mp3')
                            .save(tempFile)
                            .on('end', resolve)
                            .on('error', (e) => {
                                console.error('[PLAY] ffmpeg error:', e?.message || e);
                                reject(e);
                            });
                    });

                    await sock.sendMessage(chatId, {
                        audio: { url: tempFile },
                        mimetype: "audio/mpeg",
                        fileName: `${songTitle || 'audio'}.mp3`
                    }, { quoted: msg });

                    setTimeout(() => {
                        try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
                    }, 2000);

                    return;
                } catch (fbErr) {
                    console.error('[PLAY] ytdl-core fallback failed:', fbErr?.message || fbErr);
                    
                    try {
                        if (!ytdlp) throw new Error('yt-dlp-exec not installed');
                        const tempDir = path.join(__dirname, '../temp');
                        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
                        const outBase = path.join(tempDir, `${Date.now()}`);
                        const output = `${outBase}.%(ext)s`;

                        await ytdlp(videoUrl, {
                            output,
                            extractAudio: true,
                            audioFormat: 'mp3',
                            audioQuality: '0',
                            noProgress: true,
                            noPart: true,
                            addHeader: [
                                'user-agent: Mozilla/5.0',
                                'referer: https://www.youtube.com/'
                            ]
                        });

                        const outFile = `${outBase}.mp3`;
                        
                        await sock.sendMessage(chatId, {
                            audio: { url: outFile },
                            mimetype: 'audio/mpeg',
                            fileName: `${songTitle || 'audio'}.mp3`
                        }, { quoted: msg });

                        setTimeout(() => {
                            try { if (fs.existsSync(outFile)) fs.unlinkSync(outFile); } catch {}
                        }, 2000);

                        return;
                    } catch (dlpErr) {
                        console.error('[PLAY] yt-dlp fallback failed:', dlpErr?.message || dlpErr);
                    }

                    try {
                        const id = musicDownloader.extractVideoId(videoUrl);
                        if (!id) throw new Error('Unable to extract video ID for alternative source');
                        const resp = await alternativeSource.getAudioStreams(id);
                        if (!resp.ok) throw new Error('No audio streams available via alternative source');

                        const sorted = resp.streams
                            .slice()
                            .sort((a, b) => (parseInt(b.bitrate || '0') || 0) - (parseInt(a.bitrate || '0') || 0));
                        const preferred = sorted.find(s => (s.mimeType || '').includes('audio/mp4')) || sorted[0];
                        const mime = preferred.mimeType || 'audio/mp4';
                        const ext = mime.includes('webm') ? 'webm' : (mime.includes('mp4') ? 'm4a' : 'audio');

                        const tempDir = path.join(__dirname, '../temp');
                        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
                        const tempIn = path.join(tempDir, `${Date.now()}.${ext}`);
                        const tempOut = path.join(tempDir, `${Date.now()}-conv.mp3`);

                        const dlResp = await axios({ url: preferred.url, method: 'GET', responseType: 'stream', timeout: 30000, maxRedirects: 5 });
                        await new Promise((resolve, reject) => {
                            const w = fs.createWriteStream(tempIn);
                            dlResp.data.pipe(w);
                            w.on('finish', resolve);
                            w.on('error', reject);
                        });

                        let converted = false;
                        try {
                            const ffmpeg = (await import('fluent-ffmpeg')).default;
                            await new Promise((resolve, reject) => {
                                ffmpeg(tempIn)
                                    .audioBitrate(128)
                                    .toFormat('mp3')
                                    .save(tempOut)
                                    .on('end', resolve)
                                    .on('error', reject);
                            });
                            converted = true;
                        } catch (convErr) {
                            console.warn('[PLAY] Conversion failed, sending original file:', convErr?.message || convErr);
                        }

                        await sock.sendMessage(chatId, {
                            audio: { url: converted ? tempOut : tempIn },
                            mimetype: converted ? 'audio/mpeg' : mime,
                            fileName: `${songTitle || 'audio'}.${converted ? 'mp3' : ext}`
                        }, { quoted: msg });

                        setTimeout(() => {
                            try { if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn); } catch {}
                            try { if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut); } catch {}
                        }, 2000);

                        return;
                    } catch (pErr) {
                        console.error('[PLAY] Alternative source fallback failed:', pErr?.message || pErr);
                        return await sock.sendMessage(chatId, {
                            text: `${emojis.error} All download methods failed. Please try again later.`,
                            react: { text: emojis.error, key: msg.key }
                        }, { quoted: msg });
                    }
                }
            }

            if (musicResult && musicResult.status && musicResult.result?.download) {
                const tempDir = path.join(__dirname, '../temp');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
                const tempFile = path.join(tempDir, `${Date.now()}_raw.mp3`);
                const convertedFile = path.join(tempDir, `${Date.now()}_converted.mp3`);

                const response = await axios({
                    url: musicResult.result.download,
                    method: 'GET',
                    responseType: 'stream',
                    timeout: 60000,
                    maxRedirects: 5
                });

                await new Promise((resolve, reject) => {
                    const writer = fs.createWriteStream(tempFile);
                    response.data.pipe(writer);
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                // Verify file was downloaded and has content
                if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size < 1024) {
                    throw new Error('Downloaded file is invalid or too small');
                }

                // Convert to proper MP3 format for better compatibility
                let finalFile = tempFile;
                try {
                    const ffmpeg = (await import('fluent-ffmpeg')).default;
                    await new Promise((resolve, reject) => {
                        ffmpeg(tempFile)
                            .audioCodec('libmp3lame')
                            .audioBitrate(128)
                            .audioChannels(2)
                            .audioFrequency(44100)
                            .toFormat('mp3')
                            .save(convertedFile)
                            .on('end', resolve)
                            .on('error', (err) => {
                                console.warn('[PLAY] Conversion failed, using original:', err?.message || err);
                                resolve(); // Continue with original file
                            });
                    });
                    
                    if (fs.existsSync(convertedFile) && fs.statSync(convertedFile).size > 1024) {
                        finalFile = convertedFile;
                    }
                } catch (convErr) {
                    console.warn('[PLAY] FFmpeg conversion skipped:', convErr?.message || convErr);
                }

                await sock.sendMessage(chatId, {
                    audio: { url: finalFile },
                    mimetype: "audio/mpeg",
                    fileName: `${musicResult.result.title || 'audio'}.mp3`,
                    contextInfo: {
                        externalAdReply: {
                            title: musicResult.result.title || 'Music',
                            body: 'Downloaded by HORLA POOKIE Bot',
                            thumbnailUrl: musicResult.result.thumbnail || `https://i.ytimg.com/vi/${musicDownloader.extractVideoId(videoUrl)}/maxresdefault.jpg`,
                            sourceUrl: videoUrl,
                            mediaType: 2,
                            mediaUrl: videoUrl
                        }
                    }
                }, { quoted: msg });

                await sock.sendMessage(chatId, {
                    react: { text: emojis.success, key: msg.key }
                });

                setTimeout(() => {
                    try { 
                        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                        if (fs.existsSync(convertedFile)) fs.unlinkSync(convertedFile);
                    } catch {}
                }, 2000);
            }

        } catch (error) {
            console.error('[PLAY] Unexpected error:', error);
            await sock.sendMessage(chatId, {
                text: `${emojis.error} An error occurred while processing your request.`,
                react: { text: emojis.error, key: msg.key }
            }, { quoted: msg });
        }
    }
};
