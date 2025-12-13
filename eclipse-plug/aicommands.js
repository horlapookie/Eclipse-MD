// ====================================
// ECLIPSE-MD ARTIFICIAL INTELLIGENCE COMMANDS
// ====================================

import { queryAI, generateImage, getModelList, getModelInfo, getImageModelList, getImageModelInfo } from '../lib/prexzyAI.js';
import axios from 'axios';

async function getPromptFromMessage(msg, args) {
  let text = '';
  
  if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
    const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
    if (quotedMsg.conversation) {
      text = quotedMsg.conversation;
    } else if (quotedMsg.extendedTextMessage?.text) {
      text = quotedMsg.extendedTextMessage.text;
    }
  }
  
  if (!text && args.length > 0) {
    text = args.join(' ');
  }
  
  return text;
}

async function handleAICommand(modelKey, msg, sock, args, settings) {
  const from = msg.key.remoteJid;
  const modelInfo = getModelInfo(modelKey);
  const modelName = modelInfo?.name || modelKey.toUpperCase();
  
  const prompt = await getPromptFromMessage(msg, args);
  
  if (!prompt) {
    return await sock.sendMessage(from, {
      text: `❓ Please provide a question or prompt!\n\nUsage:\n• ${settings.prefix}${modelKey} <your question>\n• Reply to a message with ${settings.prefix}${modelKey}`
    }, { quoted: msg });
  }
  
  if (prompt.length > 4000) {
    return await sock.sendMessage(from, {
      text: '❌ Text is too long! Maximum 4000 characters allowed.'
    }, { quoted: msg });
  }
  
  try {
    await sock.sendMessage(from, {
      text: `🤖 *${modelName}* is thinking... Please wait!`
    }, { quoted: msg });
    
    const result = await queryAI(modelKey, prompt);
    
    if (result && result.length > 0) {
      await sock.sendMessage(from, {
        text: `🤖 *${modelName} Response:*\n\n${result}`
      }, { quoted: msg });
    } else {
      throw new Error('Empty response');
    }
  } catch (error) {
    console.error(`[${modelKey.toUpperCase()}] Error:`, error.message);
    await sock.sendMessage(from, {
      text: `❌ ${error.message || `Sorry, ${modelName} is currently unavailable. Please try again later.`}`
    }, { quoted: msg });
  }
}

async function handleImageCommand(modelKey, msg, sock, args, settings, options = {}) {
  const from = msg.key.remoteJid;
  const modelInfo = getImageModelInfo(modelKey);
  const modelName = modelInfo?.name || modelKey.toUpperCase();
  
  const prompt = await getPromptFromMessage(msg, args);
  
  if (!prompt) {
    return await sock.sendMessage(from, {
      text: `❓ Please provide a prompt for image generation!\n\nUsage:\n• ${settings.prefix}${modelKey} <description of image>\n\nExample: ${settings.prefix}${modelKey} A beautiful sunset over mountains`
    }, { quoted: msg });
  }
  
  try {
    await sock.sendMessage(from, {
      text: `🎨 *${modelName}* is generating your image... Please wait!`
    }, { quoted: msg });
    
    const imageUrl = await generateImage(modelKey, prompt, options);
    
    if (imageUrl) {
      await sock.sendMessage(from, {
        image: { url: imageUrl },
        caption: `🎨 *${modelName}*\n\n📝 *Prompt:* ${prompt}`
      }, { quoted: msg });
    } else {
      throw new Error('No image generated');
    }
  } catch (error) {
    console.error(`[${modelKey.toUpperCase()}] Error:`, error.message);
    await sock.sendMessage(from, {
      text: `❌ ${error.message || `Sorry, ${modelName} is currently unavailable. Please try again later.`}`
    }, { quoted: msg });
  }
}

async function handleReactionCommand(reaction, msg, sock, settings) {
  const from = msg.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNumber = senderJid.split('@')[0];
  
  let targetJid = null;
  let targetNumber = null;
  
  if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
    targetJid = msg.message.extendedTextMessage.contextInfo.participant;
    targetNumber = targetJid.split('@')[0];
  } else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
    targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    targetNumber = targetJid.split('@')[0];
  }
  
  const reactionVerbs = {
    hug: 'hugs', slap: 'slaps', pat: 'pats', cry: 'cries with',
    kill: 'kills', bite: 'bites', yeet: 'yeets', bully: 'bullies',
    bonk: 'bonks', wink: 'winks at', poke: 'pokes', cuddle: 'cuddles',
    wave: 'waves at', dance: 'dances with', blush: 'blushes at',
    smile: 'smiles at', happy: 'is happy with', smug: 'is smug at', highfive: 'highfives',
    kiss: 'kisses', punch: 'punches', kick: 'kicks', neko: 'shows neko to'
  };
  
  const verb = reactionVerbs[reaction] || reaction + 's';
  
  let caption = '';
  let mentions = [];
  
  if (targetJid && targetNumber !== senderNumber) {
    caption = `@${senderNumber} ${verb} @${targetNumber} 🎌`;
    mentions = [senderJid, targetJid];
  } else {
    caption = `@${senderNumber} ${verb}! 🎌`;
    mentions = [senderJid];
  }
  
  try {
    let gifUrl = null;
    let buffer = null;
    
    const nekosBestEndpoints = ['hug', 'slap', 'pat', 'kiss', 'punch', 'kick', 'bite', 'cuddle', 'poke', 'wave', 'dance', 'blush', 'smile', 'happy', 'smug', 'highfive', 'cry', 'wink', 'bored', 'nod', 'nom', 'nope', 'pout', 'shrug', 'sleep', 'stare', 'think', 'thumbsup', 'tickle', 'yeet', 'baka', 'feed', 'handhold', 'handshake', 'laugh', 'neko', 'shoot', 'yawn'];
    const waifuPicsEndpoints = ['waifu', 'neko', 'shinobu', 'megumin', 'bully', 'cuddle', 'cry', 'hug', 'awoo', 'kiss', 'lick', 'pat', 'smug', 'bonk', 'yeet', 'blush', 'smile', 'wave', 'highfive', 'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'kick', 'happy', 'wink', 'poke', 'dance', 'cringe'];
    
    if (nekosBestEndpoints.includes(reaction)) {
      try {
        const nekoResponse = await axios.get(`https://nekos.best/api/v2/${reaction}`, { timeout: 15000 });
        if (nekoResponse.data?.results?.[0]?.url) {
          gifUrl = nekoResponse.data.results[0].url;
        }
      } catch (e) {
        console.log(`[REACTION] nekos.best failed for ${reaction}, trying fallback...`);
      }
    }
    
    if (!gifUrl && waifuPicsEndpoints.includes(reaction)) {
      try {
        const waifuResponse = await axios.get(`https://api.waifu.pics/sfw/${reaction}`, { timeout: 15000 });
        if (waifuResponse.data?.url) {
          gifUrl = waifuResponse.data.url;
        }
      } catch (e) {
        console.log(`[REACTION] waifu.pics failed for ${reaction}, trying fallback...`);
      }
    }
    
    if (!gifUrl) {
      try {
        console.log(`[REACTION] Trying prexzyvilla API for ${reaction}...`);
        const prexzyResponse = await axios.get(`https://apis.prexzyvilla.site/anime/${reaction}`, {
          responseType: 'arraybuffer',
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        const contentType = prexzyResponse.headers['content-type'] || '';
        buffer = Buffer.from(prexzyResponse.data);
        
        console.log(`[REACTION] prexzyvilla response: ${contentType}, size: ${buffer.length}`);
        
        if (buffer.length > 1000) {
          if (contentType.includes('gif') || contentType.includes('video')) {
            await sock.sendMessage(from, {
              video: buffer,
              gifPlayback: true,
              caption: caption,
              mentions: mentions
            }, { quoted: msg });
            return;
          } else if (contentType.includes('image')) {
            await sock.sendMessage(from, {
              image: buffer,
              caption: caption,
              mentions: mentions
            }, { quoted: msg });
            return;
          }
        }
      } catch (e) {
        console.log(`[REACTION] prexzy API failed for ${reaction}:`, e.message);
      }
    }
    
    if (gifUrl) {
      const isGif = gifUrl.endsWith('.gif');
      const isVideo = gifUrl.endsWith('.mp4') || gifUrl.endsWith('.webm');
      
      if (isGif || isVideo) {
        const gifResponse = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 30000 });
        buffer = Buffer.from(gifResponse.data);
        
        await sock.sendMessage(from, {
          video: buffer,
          gifPlayback: true,
          caption: caption,
          mentions: mentions
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, {
          image: { url: gifUrl },
          caption: caption,
          mentions: mentions
        }, { quoted: msg });
      }
    } else {
      throw new Error('No GIF source available');
    }
  } catch (error) {
    console.error(`[REACTION ${reaction}] Error:`, error.message);
    await sock.sendMessage(from, {
      text: `❌ Could not fetch ${reaction} GIF. Please try again!`
    }, { quoted: msg });
  }
}

async function handleSpecialAI(endpoint, msg, sock, args, settings, paramName = 'text') {
  const from = msg.key.remoteJid;
  const prompt = await getPromptFromMessage(msg, args);
  
  if (!prompt) {
    return await sock.sendMessage(from, {
      text: `❓ Please provide input!\n\nUsage: ${settings.prefix}${endpoint} <your text>`
    }, { quoted: msg });
  }
  
  try {
    await sock.sendMessage(from, {
      text: `🤖 Processing your request... Please wait!`
    }, { quoted: msg });
    
    const response = await axios.get(`https://apis.prexzyvilla.site/ai/${endpoint}`, {
      params: { [paramName]: prompt },
      timeout: 60000
    });
    
    let result = '';
    if (response.data?.status === true) {
      result = response.data.result || response.data.text || response.data.reply || 
               response.data.data?.result || response.data.data?.text || 
               JSON.stringify(response.data.data || response.data);
    } else {
      throw new Error(response.data?.error || 'Failed to get response');
    }
    
    await sock.sendMessage(from, {
      text: `🤖 *Result:*\n\n${result}`
    }, { quoted: msg });
  } catch (error) {
    console.error(`[${endpoint.toUpperCase()}] Error:`, error.message);
    await sock.sendMessage(from, {
      text: `❌ ${error.message || 'Sorry, this feature is currently unavailable.'}`
    }, { quoted: msg });
  }
}

const aiModelsCommand = {
  name: 'aimodels',
  description: 'List all available AI models',
  aliases: ['listai', 'ailist'],
  async execute(msg, { sock, settings }) {
    const from = msg.key.remoteJid;
    const models = getModelList();
    const imageModels = getImageModelList();
    
    let text = `🤖 *Available AI Chat Models (${models.length})*\n\n`;
    
    const categories = {
      'GPT Models': ['gpt41', 'gpt41nano', 'gpt41mini', 'gpt4o', 'gpt4omini', 'gpt4', 'gpt4turbo', 'gpt35turbo', 'gpt5nano', 'gpt5'],
      'Reasoning Models': ['o1', 'o1mini', 'o3mini', 'o4mini', 'o3'],
      'ChatGPT': ['chatgpt4o', 'chatgpt', 'ai4chat', 'chataibot'],
      'Other AI': ['gemini', 'deepseek', 'claude', 'grok', 'metaai', 'qwen', 'copilot', 'copilotthink']
    };
    
    for (const [category, keys] of Object.entries(categories)) {
      text += `╭━━━✦❮ ${category} ❯✦━━━╮\n`;
      for (const key of keys) {
        const model = models.find(m => m.key === key);
        if (model) {
          text += `┃ ${settings.prefix}${key}\n`;
        }
      }
      text += `╰━━━━━━━━━━━━━━━━━━╯\n\n`;
    }
    
    text += `🎨 *AI Image Generators (${imageModels.length})*\n\n`;
    text += `╭━━━✦❮ Image AI ❯✦━━━╮\n`;
    for (const model of imageModels) {
      text += `┃ ${settings.prefix}${model.key}\n`;
    }
    text += `╰━━━━━━━━━━━━━━━━━━╯\n\n`;
    
    text += `💡 *Usage:* ${settings.prefix}<model> <your question/prompt>\n`;
    text += `Example: ${settings.prefix}gpt4o What is AI?`;
    
    await sock.sendMessage(from, { text }, { quoted: msg });
  }
};

const ai4chatCommand = {
  name: 'ai4chat',
  description: 'Chat with AI4Chat assistant',
  aliases: ['aichat'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('ai4chat', msg, sock, args, settings);
  }
};

const gpt41Command = {
  name: 'gpt41',
  description: 'Chat with GPT-4.1 - Most advanced model',
  aliases: ['gpt-41'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('gpt41', msg, sock, args, settings);
  }
};

const gpt41nanoCommand = {
  name: 'gpt41nano',
  description: 'Chat with GPT-4.1 Nano - Fast responses',
  aliases: ['gpt41n'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('gpt41nano', msg, sock, args, settings);
  }
};

const gpt41miniCommand = {
  name: 'gpt41mini',
  description: 'Chat with GPT-4.1 Mini - Fastest',
  aliases: ['gpt41m'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('gpt41mini', msg, sock, args, settings);
  }
};

const gpt4oCommand = {
  name: 'gpt4o',
  description: 'Chat with GPT-4o - Best overall performance',
  aliases: ['4o'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('gpt4o', msg, sock, args, settings);
  }
};

const gpt4ominiCommand = {
  name: 'gpt4omini',
  description: 'Chat with GPT-4o Mini - Quick responses',
  aliases: ['4omini'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('gpt4omini', msg, sock, args, settings);
  }
};

const o1Command = {
  name: 'o1',
  description: 'Chat with O1 - Advanced reasoning',
  aliases: ['o1ai'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('o1', msg, sock, args, settings);
  }
};

const o1miniCommand = {
  name: 'o1mini',
  description: 'Chat with O1 Mini - Fast reasoning',
  aliases: ['o1m'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('o1mini', msg, sock, args, settings);
  }
};

const o3miniCommand = {
  name: 'o3mini',
  description: 'Chat with O3 Mini - Compact reasoning',
  aliases: ['o3m'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('o3mini', msg, sock, args, settings);
  }
};

const o4miniCommand = {
  name: 'o4mini',
  description: 'Chat with O4 Mini - Newest reasoning',
  aliases: ['o4m'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('o4mini', msg, sock, args, settings);
  }
};

const o3Command = {
  name: 'o3',
  description: 'Chat with O3 - Most powerful reasoning',
  aliases: ['o3ai'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('o3', msg, sock, args, settings);
  }
};

const chatgpt4oCommand = {
  name: 'chatgpt4o',
  description: 'Chat with ChatGPT-4o Latest',
  aliases: ['cg4o'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('chatgpt4o', msg, sock, args, settings);
  }
};

const gpt4Command = {
  name: 'gpt-4',
  description: 'Chat with GPT-4 - Reliable and proven',
  aliases: ['gpt4x'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('gpt4', msg, sock, args, settings);
  }
};

const gpt4turboCommand = {
  name: 'gpt4turbo',
  description: 'Chat with GPT-4 Turbo - Fast GPT-4',
  aliases: ['gpt4t'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('gpt4turbo', msg, sock, args, settings);
  }
};

const gpt35turboCommand = {
  name: 'gpt35turbo',
  description: 'Chat with GPT-3.5 Turbo - Fast and efficient',
  aliases: ['gpt35', 'gpt3'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('gpt35turbo', msg, sock, args, settings);
  }
};

const gpt5nanoCommand = {
  name: 'gpt5nano',
  description: 'Chat with GPT-5 Nano',
  aliases: ['gpt5n'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('gpt5nano', msg, sock, args, settings);
  }
};

const gpt5Command = {
  name: 'gpt5',
  description: 'Chat with GPT-5 - Advanced AI',
  aliases: ['gpt-5'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('gpt5', msg, sock, args, settings);
  }
};

const geminiCommand = {
  name: 'gemini',
  description: 'Chat with Google Gemini AI',
  aliases: ['bard'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('gemini', msg, sock, args, settings);
  }
};

const deepseekCommand = {
  name: 'deepseek',
  description: 'Chat with DeepSeek AI',
  aliases: ['deeps'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('deepseek', msg, sock, args, settings);
  }
};

const claudeCommand = {
  name: 'claude',
  description: 'Chat with Claude AI by Anthropic',
  aliases: ['anthropic'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('claude', msg, sock, args, settings);
  }
};

const grokCommand = {
  name: 'grok2',
  description: 'Chat with Grok AI by xAI',
  aliases: ['xai', 'grokai'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('grok', msg, sock, args, settings);
  }
};

const metaaiCommand = {
  name: 'metaai',
  description: 'Chat with Meta AI',
  aliases: ['llama', 'meta'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('metaai', msg, sock, args, settings);
  }
};

const qwenCommand = {
  name: 'qwen',
  description: 'Chat with Qwen AI by Alibaba',
  aliases: ['alibaba'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('qwen', msg, sock, args, settings);
  }
};

const copilotCommand = {
  name: 'copilot2',
  description: 'Chat with Microsoft Copilot',
  aliases: ['mscopilot'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('copilot', msg, sock, args, settings);
  }
};

const copilotthinkCommand = {
  name: 'copilotthink',
  description: 'Chat with Copilot Think Deeper mode',
  aliases: ['copilotdeep', 'thinkdeep'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('copilotthink', msg, sock, args, settings);
  }
};

const chatgptCommand = {
  name: 'chatgpt',
  description: 'Chat with OpenAI ChatGPT',
  aliases: ['openai'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('chatgpt', msg, sock, args, settings);
  }
};

const chataibotCommand = {
  name: 'chataibot',
  description: 'Chat with free AI chatbot',
  aliases: ['freeai', 'aibot'],
  async execute(msg, { sock, args, settings }) {
    await handleAICommand('chataibot', msg, sock, args, settings);
  }
};

const dreamCommand = {
  name: 'dream',
  description: 'AI Dream Interpreter - analyze your dreams',
  aliases: ['dreamai', 'interpret'],
  async execute(msg, { sock, args, settings }) {
    await handleSpecialAI('dream', msg, sock, args, settings, 'dream');
  }
};

const storyCommand = {
  name: 'story',
  description: 'Generate AI stories',
  aliases: ['storyai', 'quickstory'],
  async execute(msg, { sock, args, settings }) {
    await handleSpecialAI('quick', msg, sock, args, settings, 'text');
  }
};

const ai4chatImgCommand = {
  name: 'ai4chatimg',
  description: 'Generate images with AI4Chat',
  aliases: ['aichatimg'],
  async execute(msg, { sock, args, settings }) {
    await handleImageCommand('ai4chatimg', msg, sock, args, settings, { ratio: '1:1' });
  }
};

const dalleCommand = {
  name: 'dalle',
  description: 'Generate images with DALL-E 3 XL',
  aliases: ['dalle3', 'dallexl'],
  async execute(msg, { sock, args, settings }) {
    await handleImageCommand('dalle', msg, sock, args, settings, { width: 1024, height: 1024 });
  }
};

const txt2imgCommand = {
  name: 'txt2img',
  description: 'Generate images from text prompts',
  aliases: ['text2img', 'texttoimg'],
  async execute(msg, { sock, args, settings }) {
    await handleImageCommand('txt2img', msg, sock, args, settings, { width: 512, height: 512, quantity: 1 });
  }
};

const aidocimgCommand = {
  name: 'aidocimg',
  description: 'Generate AI images from text prompts',
  aliases: ['aidoc'],
  async execute(msg, { sock, args, settings }) {
    await handleImageCommand('aidocimg', msg, sock, args, settings, { isNew: 'true' });
  }
};

const hugCommand = {
  name: 'hug',
  description: 'Send a random anime hug GIF',
  aliases: ['animehug'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('hug', msg, sock, settings);
  }
};

const slapCommand = {
  name: 'slap',
  description: 'Send a random anime slap GIF',
  aliases: ['animeslap'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('slap', msg, sock, settings);
  }
};

const patCommand = {
  name: 'pat',
  description: 'Send a random anime pat GIF',
  aliases: ['animepat', 'headpat'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('pat', msg, sock, settings);
  }
};

const cryCommand = {
  name: 'cry',
  description: 'Send a random anime cry GIF',
  aliases: ['animecry', 'sad'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('cry', msg, sock, settings);
  }
};

const killCommand = {
  name: 'animekill',
  description: 'Send a random anime kill GIF',
  aliases: ['akill'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('kill', msg, sock, settings);
  }
};

const biteCommand = {
  name: 'bite',
  description: 'Send a random anime bite GIF',
  aliases: ['animebite'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('bite', msg, sock, settings);
  }
};

const yeetCommand = {
  name: 'yeet',
  description: 'Send a random anime yeet GIF',
  aliases: ['animeyeet', 'throw'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('yeet', msg, sock, settings);
  }
};

const bullyCommand = {
  name: 'bully',
  description: 'Send a random anime bully GIF',
  aliases: ['animebully'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('bully', msg, sock, settings);
  }
};

const bonkCommand = {
  name: 'bonk',
  description: 'Send a random anime bonk GIF',
  aliases: ['animebonk'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('bonk', msg, sock, settings);
  }
};

const winkCommand = {
  name: 'wink',
  description: 'Send a random anime wink GIF',
  aliases: ['animewink'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('wink', msg, sock, settings);
  }
};

const pokeCommand = {
  name: 'poke',
  description: 'Send a random anime poke GIF',
  aliases: ['animepoke'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('poke', msg, sock, settings);
  }
};

const cuddleCommand = {
  name: 'cuddle',
  description: 'Send a random anime cuddle GIF',
  aliases: ['animecuddle'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('cuddle', msg, sock, settings);
  }
};

const waveCommand = {
  name: 'wave',
  description: 'Send a random anime wave GIF',
  aliases: ['animewave', 'hi'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('wave', msg, sock, settings);
  }
};

const danceCommand = {
  name: 'dance',
  description: 'Send a random anime dance GIF',
  aliases: ['animedance'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('dance', msg, sock, settings);
  }
};

const blushCommand = {
  name: 'blush',
  description: 'Send a random anime blush GIF',
  aliases: ['animeblush', 'shy'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('blush', msg, sock, settings);
  }
};

const smileCommand = {
  name: 'smile',
  description: 'Send a random anime smile GIF',
  aliases: ['animesmile'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('smile', msg, sock, settings);
  }
};

const happyCommand = {
  name: 'happy',
  description: 'Send a random anime happy GIF',
  aliases: ['animehappy', 'joy'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('happy', msg, sock, settings);
  }
};

const smugCommand = {
  name: 'smug',
  description: 'Send a random anime smug GIF',
  aliases: ['animesmug'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('smug', msg, sock, settings);
  }
};

const highfiveCommand = {
  name: 'highfive',
  description: 'Send a random anime highfive GIF',
  aliases: ['animehighfive', 'h5'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('highfive', msg, sock, settings);
  }
};

const kissCommand = {
  name: 'kiss',
  description: 'Send a random anime kiss GIF',
  aliases: ['animekiss'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('kiss', msg, sock, settings);
  }
};

const punchCommand = {
  name: 'punch',
  description: 'Send a random anime punch GIF',
  aliases: ['animepunch'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('punch', msg, sock, settings);
  }
};

const lickCommand = {
  name: 'lick',
  description: 'Send a random anime lick GIF',
  aliases: ['animelick'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('lick', msg, sock, settings);
  }
};

const nekoCommand = {
  name: 'neko',
  description: 'Send a random neko GIF',
  aliases: ['animeneko', 'catgirl'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('neko', msg, sock, settings);
  }
};

const nomCommand = {
  name: 'nom',
  description: 'Send a random anime nom GIF',
  aliases: ['animenom', 'eat'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('nom', msg, sock, settings);
  }
};

const glompCommand = {
  name: 'glomp',
  description: 'Send a random anime glomp GIF',
  aliases: ['animeglomp'],
  async execute(msg, { sock, settings }) {
    await handleReactionCommand('glomp', msg, sock, settings);
  }
};

export default [
  aiModelsCommand,
  ai4chatCommand,
  gpt41Command,
  gpt41nanoCommand,
  gpt41miniCommand,
  gpt4oCommand,
  gpt4ominiCommand,
  o1Command,
  o1miniCommand,
  o3miniCommand,
  o4miniCommand,
  o3Command,
  chatgpt4oCommand,
  gpt4Command,
  gpt4turboCommand,
  gpt35turboCommand,
  gpt5nanoCommand,
  gpt5Command,
  geminiCommand,
  deepseekCommand,
  claudeCommand,
  grokCommand,
  metaaiCommand,
  qwenCommand,
  copilotCommand,
  copilotthinkCommand,
  chatgptCommand,
  chataibotCommand,
  dreamCommand,
  storyCommand,
  ai4chatImgCommand,
  dalleCommand,
  txt2imgCommand,
  aidocimgCommand,
  hugCommand,
  slapCommand,
  patCommand,
  cryCommand,
  killCommand,
  biteCommand,
  yeetCommand,
  bullyCommand,
  bonkCommand,
  winkCommand,
  pokeCommand,
  cuddleCommand,
  waveCommand,
  danceCommand,
  blushCommand,
  smileCommand,
  happyCommand,
  smugCommand,
  highfiveCommand,
  kissCommand,
  punchCommand,
  lickCommand,
  nekoCommand,
  nomCommand,
  glompCommand
];
