import fs from 'fs';
import path from 'path';
import axios from 'axios';

const emojisPath = path.join(process.cwd(), 'data', 'emojis.json');
const emojis = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));

const wrgGames = new Map();

const categories = [
  { 
    name: 'Animals', 
    keywords: ['animal', 'bird', 'mammal', 'fish', 'reptile', 'insect', 'pet'],
    examples: ['cat', 'dog', 'lion', 'eagle', 'snake', 'butterfly']
  },
  { 
    name: 'Food', 
    keywords: ['food', 'fruit', 'vegetable', 'meal', 'dish', 'cuisine'],
    examples: ['pizza', 'apple', 'carrot', 'rice', 'bread', 'chicken']
  },
  { 
    name: 'Countries', 
    keywords: ['country', 'nation', 'state'],
    examples: ['nigeria', 'usa', 'china', 'france', 'brazil', 'india']
  },
  { 
    name: 'Colors', 
    keywords: ['color', 'colour', 'shade', 'hue'],
    examples: ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
  },
  { 
    name: 'Sports', 
    keywords: ['sport', 'game', 'athletics'],
    examples: ['football', 'basketball', 'tennis', 'cricket', 'swimming']
  },
  { 
    name: 'Cities', 
    keywords: ['city', 'town', 'capital'],
    examples: ['lagos', 'london', 'tokyo', 'paris', 'dubai', 'newyork']
  },
  { 
    name: 'Professions', 
    keywords: ['job', 'profession', 'career', 'occupation'],
    examples: ['doctor', 'teacher', 'engineer', 'nurse', 'lawyer']
  },
  { 
    name: 'Any Word', 
    keywords: [],
    examples: ['any valid english word']
  }
];

async function validateWord(word) {
  try {
    // Use Free Dictionary API to validate if word exists
    const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      timeout: 5000
    });
    return response.status === 200 && response.data && response.data.length > 0;
  } catch (error) {
    // If word not found or error, return false
    return false;
  }
}

async function validateCategory(word, category) {
  if (category.name === 'Any Word') {
    return await validateWord(word);
  }

  // For specific categories, check if word is valid first
  const isValidWord = await validateWord(word);
  if (!isValidWord) return false;

  // For now, we'll accept any valid word for the category
  // In a more advanced version, you could use AI or category-specific APIs
  return true;
}

export default {
  name: "wrg",
  description: "Word Random Game: Submit words based on random prompts",
  aliases: ["randomword", "wordgame"],
  category: "Word Chain",
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const prefix = settings?.prefix || '.';

    try {
      if (!args.length) {
        const helpText = `🎮 *WORD RANDOM GAME (WRG)* 🎮

📝 *How to Play:*
Submit valid English words based on the given category within the time limit!

⚡ *Commands:*
┃ ${prefix}wrg start - Start multiplayer game (default)
┃ ${prefix}wrg start solo - Start solo game (personal challenge)
┃ ${prefix}wrg start multi - Start multiplayer game
┃ ${prefix}wrg end - End the current game
┃ ${prefix}wrg <word> - Submit your word

📖 *Example:*
Game Prompt: "Animals"
Player: ${prefix}wrg lion
Player: ${prefix}wrg elephant

🎮 *Game Modes:*
👥 *Multiplayer:* Everyone can participate and compete
👤 *Solo:* Personal challenge, only you can play

💡 *Categories:*
${categories.map(c => `• ${c.name}${c.examples.length > 0 ? ` (e.g., ${c.examples.slice(0, 3).join(', ')})` : ''}`).join('\n')}

💡 *Rules:*
• Word must be a valid English word
• Words are validated using dictionary API
• Submit as many words as you can
• No repeating words in same game
• Game ends after 5 minutes or when stopped

🎯 *Status:* ${wrgGames.has(from) ? '🟢 Game Active' : '🔴 No Active Game'}`;

        return await sock.sendMessage(from, { text: helpText }, { quoted: msg });
      }

      const command = args[0].toLowerCase();

      if (command === 'start') {
        const mode = args[1]?.toLowerCase();
        const isSolo = mode === 'solo' || mode === 'single' || mode === '1';
        
        const category = categories[Math.floor(Math.random() * categories.length)];
        const playerJid = msg.key.participant || msg.key.remoteJid;

        wrgGames.set(from, {
          category: category.name,
          categoryKeywords: category.keywords,
          categoryExamples: category.examples,
          usedWords: [],
          players: new Map([[playerJid, 0]]),
          startTime: Date.now(),
          timeLimit: 5 * 60 * 1000,
          mode: isSolo ? 'solo' : 'multi'
        });

        const modeText = isSolo 
          ? '👤 *Mode:* Solo (Personal Challenge)\n⏱️ Beat your own high score!'
          : '👥 *Mode:* Multiplayer (Everyone can join)\n🏆 Compete with others!';

        await sock.sendMessage(from, {
          text: `🎮 *WORD RANDOM GAME STARTED!* 🎮

${modeText}
🎯 Category: *${category.name}*
⏱️ Time Limit: 5 minutes

${category.examples.length > 0 
  ? `💡 Examples: ${category.examples.slice(0, 4).join(', ')}`
  : `💡 Submit any valid English word!`}

📝 Type: ${prefix}wrg <word> to play!
✨ Words are validated using dictionary API!`
        }, { quoted: msg });

        await sock.sendMessage(from, {
          react: { text: emojis.success || '✅', key: msg.key }
        });

        setTimeout(() => {
          if (wrgGames.has(from)) {
            const game = wrgGames.get(from);
            wrgGames.delete(from);

            let leaderboard = '';
            const sortedPlayers = Array.from(game.players.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5);

            sortedPlayers.forEach(([player, score], index) => {
              const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
              leaderboard += `${medals[index]} @${player.split('@')[0]}: ${score} words\n`;
            });

            sock.sendMessage(from, {
              text: `⏰ *TIME'S UP!* ⏰

🏁 Game automatically ended after 5 minutes!

📝 Total Words: ${game.usedWords.length}

🏆 *TOP PLAYERS:*
${leaderboard || 'No players participated'}

Thanks for playing! 🎮`
            });
          }
        }, 5 * 60 * 1000);

        return;
      }

      if (command === 'end') {
        if (!wrgGames.has(from)) {
          return await sock.sendMessage(from, {
            text: `❌ No active game to end!`
          }, { quoted: msg });
        }

        const game = wrgGames.get(from);
        const duration = Math.floor((Date.now() - game.startTime) / 1000);
        
        let leaderboard = '';
        const sortedPlayers = Array.from(game.players.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        sortedPlayers.forEach(([player, score], index) => {
          const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
          leaderboard += `${medals[index]} @${player.split('@')[0]}: ${score} words\n`;
        });

        wrgGames.delete(from);

        await sock.sendMessage(from, {
          text: `🏁 *GAME ENDED!* 🏁

⏱️ Duration: ${duration}s
📝 Total Words: ${game.usedWords.length}
🎯 Category: ${game.category}

🏆 *TOP PLAYERS:*
${leaderboard || 'No players participated'}

Thanks for playing! 🎮`
        }, { quoted: msg });

        await sock.sendMessage(from, {
          react: { text: emojis.success || '🏁', key: msg.key }
        });

        return;
      }

      if (!wrgGames.has(from)) {
        return await sock.sendMessage(from, {
          text: `❌ No active game! Start one with: ${prefix}wrg start`
        }, { quoted: msg });
      }

      const game = wrgGames.get(from);
      const word = args.join(' ').toLowerCase().trim();
      const playerJid = msg.key.participant || msg.key.remoteJid;

      // Solo mode: Only the game starter can play
      if (game.mode === 'solo') {
        const gameStarter = Array.from(game.players.keys())[0];
        if (playerJid !== gameStarter) {
          return await sock.sendMessage(from, {
            text: `❌ This is a solo game! Only @${gameStarter.split('@')[0]} can play.\n💡 Start your own game: ${prefix}wrg start solo`,
            mentions: [gameStarter]
          }, { quoted: msg });
        }
      }

      if (!word || word.length < 2) {
        return await sock.sendMessage(from, {
          text: `❌ Please provide a valid word (minimum 2 letters)!`
        }, { quoted: msg });
      }

      if (game.usedWords.includes(word)) {
        return await sock.sendMessage(from, {
          text: `❌ Word *${word.toUpperCase()}* already used in this game!`
        }, { quoted: msg });
      }

      // Send "checking..." message
      const checkMsg = await sock.sendMessage(from, {
        text: `🔍 Validating *${word.toUpperCase()}*...`
      }, { quoted: msg });

      // Validate the word using dictionary API
      const isValid = await validateCategory(word, game);
      
      if (!isValid) {
        await sock.sendMessage(from, {
          text: `❌ *${word.toUpperCase()}* is not a valid English word!
💡 Make sure to spell it correctly.`
        }, { quoted: msg });
        return;
      }

      game.usedWords.push(word);
      const currentScore = game.players.get(playerJid) || 0;
      game.players.set(playerJid, currentScore + 1);

      const timeRemaining = Math.floor((game.timeLimit - (Date.now() - game.startTime)) / 1000);
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;

      await sock.sendMessage(from, {
        text: `✅ *${word.toUpperCase()}* accepted!

🎯 Category: ${game.category}
📝 Total words: ${game.usedWords.length}
🏆 Your score: ${currentScore + 1}
⏰ Time remaining: ${minutes}m ${seconds}s`
      }, { quoted: msg });

      await sock.sendMessage(from, {
        react: { text: emojis.success || '✅', key: msg.key }
      });

    } catch (error) {
      console.error('WRG command error:', error);
      await sock.sendMessage(from, {
        text: `${emojis.error || '❌'} *Error in Word Random Game*\n\n🔧 *Error:* ${error.message}`
      }, { quoted: msg });

      await sock.sendMessage(from, {
        react: { text: emojis.error || '❌', key: msg.key }
      });
    }
  }
};
