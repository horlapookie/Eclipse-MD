import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('./data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const TRIVIA_FILE = path.join(DATA_DIR, 'trivia.json');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

const triviaQuestions = [
  { question: "What is the capital city of Australia?", answer: "Canberra" },
  { question: "Which planet is known as the Red Planet?", answer: "Mars" },
  { question: "What year did the Titanic sink?", answer: "1912" },
  { question: "Who wrote the play 'Romeo and Juliet'?", answer: "William Shakespeare" },
  { question: "What is the largest mammal in the world?", answer: "Blue whale" },
  { question: "In what country would you find the ancient city of Petra?", answer: "Jordan" },
  { question: "Which element has the chemical symbol 'O'?", answer: "Oxygen" },
  { question: "Who painted the Mona Lisa?", answer: "Leonardo da Vinci" },
  { question: "What is the hardest natural substance on Earth?", answer: "Diamond" },
  { question: "Which ocean is the largest on Earth?", answer: "Pacific Ocean" },
  { question: "What is the smallest country in the world?", answer: "Vatican City" },
  { question: "Who invented the telephone?", answer: "Alexander Graham Bell" },
  { question: "What is the tallest mountain in the world?", answer: "Mount Everest" },
  { question: "Which gas do plants absorb from the atmosphere?", answer: "Carbon dioxide" },
  { question: "What is the largest desert in the world?", answer: "Antarctica" },
  { question: "Who wrote 'To Kill a Mockingbird'?", answer: "Harper Lee" },
  { question: "What is the speed of light in a vacuum (km/s)?", answer: "300000" },
  { question: "Which country is known as the Land of the Rising Sun?", answer: "Japan" },
  { question: "What is the chemical symbol for gold?", answer: "Au" },
  { question: "Who was the first person to walk on the moon?", answer: "Neil Armstrong" },
  { question: "What is the longest river in the world?", answer: "Nile" },
  { question: "Which programming language is known for web development?", answer: "JavaScript" },
  { question: "What year did World War II end?", answer: "1945" },
  { question: "Who discovered penicillin?", answer: "Alexander Fleming" },
  { question: "What is the capital of France?", answer: "Paris" },
  { question: "How many continents are there?", answer: "7" },
  { question: "What is the smallest planet in our solar system?", answer: "Mercury" },
  { question: "Who painted the Sistine Chapel ceiling?", answer: "Michelangelo" },
  { question: "What is the largest country by land area?", answer: "Russia" },
  { question: "Which element has the atomic number 1?", answer: "Hydrogen" },
  { question: "What is the boiling point of water at sea level (Celsius)?", answer: "100" },
  { question: "Who developed the theory of relativity?", answer: "Albert Einstein" },
  { question: "What is the currency of Japan?", answer: "Yen" },
  { question: "Which organ in the human body filters blood?", answer: "Kidney" },
  { question: "What is the largest island in the world?", answer: "Greenland" },
  { question: "Who wrote '1984'?", answer: "George Orwell" },
  { question: "What is the hardest rock?", answer: "Diamond" },
  { question: "Which planet has the most moons?", answer: "Saturn" },
  { question: "What is the smallest bone in the human body?", answer: "Stapes" },
  { question: "Who invented the World Wide Web?", answer: "Tim Berners-Lee" },
  { question: "What is the freezing point of water (Celsius)?", answer: "0" },
  { question: "Which animal is known as the King of the Jungle?", answer: "Lion" },
  { question: "What is the capital of Egypt?", answer: "Cairo" },
  { question: "Who wrote 'Pride and Prejudice'?", answer: "Jane Austen" },
  { question: "What is the largest organ in the human body?", answer: "Skin" },
  { question: "Which country invented paper?", answer: "China" },
  { question: "What is the chemical formula for water?", answer: "H2O" },
  { question: "Who was the first President of the United States?", answer: "George Washington" },
  { question: "What is the national animal of Australia?", answer: "Kangaroo" },
  { question: "Which ocean is the deepest?", answer: "Pacific Ocean" },
];

function loadJSON(file) {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return {};
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export default {
  name: 'trivia',
  description: 'Ask a trivia question. You have 1 minute and 3 chances to answer!',
  async execute(msg, { sock }) {
    const trivia = loadJSON(TRIVIA_FILE);
    const user = msg.key.participant || msg.key.remoteJid;

    if (trivia[user]) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❗ You already have an active trivia question. Use $answer to respond.',
      }, { quoted: msg });
      return;
    }

    const randomQ = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];

    // Save question, answer, timestamp, and chances (3)
    trivia[user] = {
      question: randomQ.question,
      answer: randomQ.answer,
      askedAt: Date.now(),
      chancesLeft: 3,
    };
    saveJSON(TRIVIA_FILE, trivia);

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🧠 *Trivia Time!*\n\n*Question:* ${randomQ.question}\n\nYou have 1 minute and 3 chances to answer.\nUse *.answer your_answer*`,
    }, { quoted: msg });
  },
};