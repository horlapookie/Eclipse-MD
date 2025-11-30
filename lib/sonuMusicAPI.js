import axios from 'axios';

const SONU_API_URL = 'https://omegatech-api.dixonomega.tech/api/ai/Sonu';

export async function generateSonuMusic(lyrics, style = '', instrument = '') {
  try {
    const params = new URLSearchParams();
    params.append('lyrics', lyrics);
    if (style) params.append('style', style);
    if (instrument) params.append('instrument', instrument);

    const response = await axios.get(`${SONU_API_URL}?${params.toString()}`, {
      timeout: 180000
    });

    if (response.data && response.data.success && response.data.results && response.data.results.length > 0) {
      const validResult = response.data.results.find(r => r.audio && r.audio.trim() !== '');
      
      if (validResult) {
        return {
          success: true,
          audioUrl: validResult.audio,
          coverUrl: validResult.cover,
          title: `AI Generated Music - ${style || 'Mixed Style'}`,
          lyrics: lyrics,
          allResults: response.data.results
        };
      } else {
        return {
          success: false,
          error: 'Music generated but no valid audio URLs found in results. Please try again.'
        };
      }
    } else if (response.data && response.data.statusCode === 200) {
      return {
        success: false,
        error: 'Music generated but no results returned. Please try again.'
      };
    } else {
      return {
        success: false,
        error: response.data?.message || 'Failed to generate music'
      };
    }
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      return {
        success: false,
        error: 'Music generation is taking longer than expected. The API is slow but working. Please try again or wait a few minutes.'
      };
    }
    return {
      success: false,
      error: err.response?.data?.message || err.message || 'API request failed'
    };
  }
}

export function formatSonuResponse(result) {
  if (!result.success) {
    return `❌ *Music Generation Failed*\n\n${result.error}`;
  }

  return `🎵 *Music Generated Successfully!*\n\n*Title:* ${result.title}\n\n_Sending audio file..._`;
}
