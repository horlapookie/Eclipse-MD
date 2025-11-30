import axios from 'axios';

const BASE_URL = 'https://apis.prexzyvilla.site/ai';

const AI_MODELS = {
  'ai4chat': { endpoint: '/chat', param: 'prompt', name: 'AI4Chat', description: 'General AI assistant' },
  'gpt41': { endpoint: '/model0', param: 'prompt', name: 'GPT-4.1', description: 'Most advanced GPT-4.1 - Best for complex tasks' },
  'gpt41nano': { endpoint: '/model1', param: 'prompt', name: 'GPT-4.1 Nano', description: 'Lightweight GPT-4.1 - Fast responses' },
  'gpt41mini': { endpoint: '/model2', param: 'prompt', name: 'GPT-4.1 Mini', description: 'Smallest GPT-4.1 - Fastest responses' },
  'gpt4o': { endpoint: '/model3', param: 'prompt', name: 'GPT-4o', description: 'Latest GPT-4o with multimodal support' },
  'gpt4omini': { endpoint: '/model4', param: 'prompt', name: 'GPT-4o Mini', description: 'Fast GPT-4o - Quick responses' },
  'o1': { endpoint: '/model5', param: 'prompt', name: 'O1', description: 'Advanced reasoning - Logic and problem solving' },
  'o1mini': { endpoint: '/model6', param: 'prompt', name: 'O1 Mini', description: 'Fast reasoning model' },
  'o3mini': { endpoint: '/model7', param: 'prompt', name: 'O3 Mini', description: 'Advanced reasoning in compact size' },
  'o4mini': { endpoint: '/model8', param: 'prompt', name: 'O4 Mini', description: 'Newest reasoning capabilities' },
  'o3': { endpoint: '/model9', param: 'prompt', name: 'O3', description: 'Most powerful O3 - Top-tier reasoning' },
  'chatgpt4o': { endpoint: '/model10', param: 'prompt', name: 'ChatGPT-4o Latest', description: 'Most up-to-date ChatGPT' },
  'gpt4': { endpoint: '/model11', param: 'prompt', name: 'GPT-4', description: 'Standard GPT-4 - Reliable and proven' },
  'gpt4turbo': { endpoint: '/model12', param: 'prompt', name: 'GPT-4 Turbo', description: 'Fast GPT-4 turbo responses' },
  'gpt35turbo': { endpoint: '/model13', param: 'prompt', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
  'gpt5nano': { endpoint: '/gpt-5-nano', param: 'text', name: 'GPT-5 Nano', description: 'Latest GPT-5 Nano model' },
  'gpt5': { endpoint: '/gpt-5', param: 'text', name: 'GPT-5', description: 'Advanced GPT-5 AI model' },
  'gemini': { endpoint: '/gemini', param: 'text', name: 'Google Gemini', description: 'Google\'s Gemini AI model' },
  'deepseek': { endpoint: '/deepseek', param: 'text', name: 'DeepSeek', description: 'DeepSeek AI model' },
  'claude': { endpoint: '/claude', param: 'text', name: 'Claude AI', description: 'Anthropic\'s Claude AI model' },
  'grok': { endpoint: '/grok', param: 'text', name: 'Grok AI', description: 'xAI\'s Grok model' },
  'metaai': { endpoint: '/meta-ai', param: 'text', name: 'Meta AI', description: 'Meta\'s AI model' },
  'qwen': { endpoint: '/qwen', param: 'text', name: 'Qwen AI', description: 'Alibaba\'s Qwen model' },
  'copilot': { endpoint: '/copilot', param: 'text', name: 'Microsoft Copilot', description: 'Microsoft Copilot AI' },
  'copilotthink': { endpoint: '/copilot-think', param: 'text', name: 'Copilot Think Deeper', description: 'Deep thinking mode for complex reasoning' },
  'chatgpt': { endpoint: '/chatgpt', param: 'prompt', name: 'ChatGPT', description: 'OpenAI ChatGPT' },
  'chataibot': { endpoint: '/chataibot', param: 'prompt', name: 'ChatAIBot', description: 'Free AI chatbot' }
};

const IMAGE_MODELS = {
  'ai4chatimg': { endpoint: '/image', params: ['prompt', 'ratio'], name: 'AI4Chat Image', description: 'Generate images with AI4Chat' },
  'dalle': { endpoint: '/dalle', params: ['prompt', 'negativePrompt', 'width', 'height'], name: 'DALL-E 3 XL', description: 'Generate high-quality images using DALL-E 3' },
  'txt2img': { endpoint: '/txt2img', params: ['prompt', 'negativePrompt', 'width', 'height', 'quantity'], name: 'Text to Image', description: 'Generate images from text prompts' },
  'aidocimg': { endpoint: '/image', params: ['prompt', 'isNew'], name: 'Aidoc Image', description: 'Generate AI images from text prompts' }
};

async function queryAI(modelKey, prompt) {
  const model = AI_MODELS[modelKey];
  if (!model) {
    throw new Error(`Unknown AI model: ${modelKey}`);
  }

  try {
    const url = `${BASE_URL}${model.endpoint}?${model.param}=${encodeURIComponent(prompt)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      },
      timeout: 60000
    });

    if (response.data && response.data.status === true) {
      if (response.data.text) {
        return response.data.text;
      } else if (response.data.reply) {
        return response.data.reply;
      } else if (response.data.response) {
        return response.data.response;
      } else if (response.data.result) {
        return response.data.result;
      }
      
      const data = response.data.data;
      if (typeof data === 'string') {
        return data;
      } else if (data && data.response) {
        return data.response;
      } else if (data && data.result) {
        return data.result;
      } else if (data && data.message) {
        return data.message;
      } else if (data && data.answer) {
        return data.answer;
      } else if (data && data.text) {
        return data.text;
      } else if (data && data.reply) {
        return data.reply;
      }
      return JSON.stringify(data);
    } else if (response.data && response.data.text) {
      return response.data.text;
    } else if (response.data && response.data.reply) {
      return response.data.reply;
    } else if (response.data && response.data.result) {
      return response.data.result;
    } else if (response.data && response.data.response) {
      return response.data.response;
    } else if (response.data && response.data.data) {
      return typeof response.data.data === 'string' ? response.data.data : JSON.stringify(response.data.data);
    }

    throw new Error('Unexpected response format');
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('AI is busy. Please try again in a few minutes.');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('AI service is currently down. Please try again later.');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. Please try again.');
    } else if (error.response?.status === 400) {
      throw new Error('Invalid request. Please try with different text.');
    }
    throw error;
  }
}

async function generateImage(modelKey, prompt, options = {}) {
  const model = IMAGE_MODELS[modelKey];
  if (!model) {
    throw new Error(`Unknown image model: ${modelKey}`);
  }

  try {
    let url = `${BASE_URL}${model.endpoint}?prompt=${encodeURIComponent(prompt)}`;
    
    if (options.ratio) url += `&ratio=${encodeURIComponent(options.ratio)}`;
    if (options.negativePrompt) url += `&negativePrompt=${encodeURIComponent(options.negativePrompt)}`;
    if (options.width) url += `&width=${options.width}`;
    if (options.height) url += `&height=${options.height}`;
    if (options.quantity) url += `&quantity=${options.quantity}`;
    if (options.isNew) url += `&isNew=${options.isNew}`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      },
      timeout: 180000
    });

    let imageUrl = null;

    console.log(`[${modelKey.toUpperCase()}] API Response:`, JSON.stringify(response.data).substring(0, 500));

    if (response.data && response.data.status === true) {
      const data = response.data.data;
      
      // Handle AI4ChatImg format: data.images.image_link
      if (data && data.images && data.images.image_link && typeof data.images.image_link === 'string') {
        imageUrl = data.images.image_link;
      }
      // Handle DALLE format: data.image_url[0].image.url
      else if (data && data.image_url && Array.isArray(data.image_url) && data.image_url.length > 0 && data.image_url[0].image && data.image_url[0].image.url) {
        imageUrl = data.image_url[0].image.url;
      }
      // Handle DALLE alt format: data is array
      else if (Array.isArray(data) && data.length > 0 && data[0].image && data[0].image.url) {
        imageUrl = data[0].image.url;
      }
      // Handle string URL directly
      else if (typeof data === 'string' && (data.startsWith('http') || data.startsWith('data:'))) {
        imageUrl = data;
      }
      // Handle object with url property
      else if (data && typeof data === 'object') {
        if (data.url && typeof data.url === 'string') {
          imageUrl = data.url;
        } else if (data.image && typeof data.image === 'string') {
          imageUrl = data.image;
        } else if (data.imageUrl && typeof data.imageUrl === 'string') {
          imageUrl = data.imageUrl;
        } else {
          console.log(`[${modelKey.toUpperCase()}] Data object keys:`, Object.keys(data));
        }
      }
    } else if (response.data && response.data.result && typeof response.data.result === 'string') {
      imageUrl = response.data.result;
    } else if (response.data && response.data.url && typeof response.data.url === 'string') {
      imageUrl = response.data.url;
    } else if (response.data && response.data.image && typeof response.data.image === 'string') {
      imageUrl = response.data.image;
    }

    if (!imageUrl) {
      console.log(`[${modelKey.toUpperCase()}] DEBUG - Full response:`, JSON.stringify(response.data, null, 2));
      throw new Error('No valid image URL received from API');
    }

    return imageUrl;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Image generator is busy. Please try again in a few minutes.');
    } else if (error.response?.status === 504) {
      throw new Error('Image generator service temporarily overloaded. Please try again in a moment.');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Image service is currently down. Please try again later.');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new Error('Image generation timed out. Please try again.');
    } else if (error.response?.status === 400) {
      throw new Error('Invalid request. Please try with different prompt.');
    }
    throw error;
  }
}

function getModelInfo(modelKey) {
  return AI_MODELS[modelKey] || null;
}

function getImageModelInfo(modelKey) {
  return IMAGE_MODELS[modelKey] || null;
}

function getAllModels() {
  return AI_MODELS;
}

function getAllImageModels() {
  return IMAGE_MODELS;
}

function getModelList() {
  return Object.entries(AI_MODELS).map(([key, info]) => ({
    key,
    name: info.name,
    description: info.description
  }));
}

function getImageModelList() {
  return Object.entries(IMAGE_MODELS).map(([key, info]) => ({
    key,
    name: info.name,
    description: info.description
  }));
}

export { 
  queryAI, 
  generateImage,
  getModelInfo, 
  getImageModelInfo,
  getAllModels, 
  getAllImageModels,
  getModelList, 
  getImageModelList,
  AI_MODELS,
  IMAGE_MODELS
};
