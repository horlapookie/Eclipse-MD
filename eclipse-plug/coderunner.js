import { runCode, formatCodeOutput } from '../lib/codeRunner.js';

export default {
  name: 'run',
  aliases: ['execute', 'code'],
  description: 'Run code in multiple languages (Python, JavaScript, Java, C, C++)',
  async execute(msg, { sock, args, settings }) {
    const from = msg.key.remoteJid;
    const prefix = settings.prefix || '.';
    
    try {
      if (!args || args.length < 2) {
        return await sock.sendMessage(from, { 
          text: `*🖥️ Code Runner*\n\nRun code in multiple programming languages!\n\n*Usage:*\n${prefix}run <language> <code>\n\n*Supported Languages:*\n• Python (python, py)\n• JavaScript (javascript, js, node)\n• Java (java)\n• C (c)\n• C++ (c++, cpp)\n\n*Example:*\n${prefix}run python print("Hello World")\n${prefix}run js console.log("Hello World")\n${prefix}run java System.out.println("Hello World");`
        }, { quoted: msg });
      }

      const language = args[0];
      const code = args.slice(1).join(' ');

      await sock.sendMessage(from, { 
        text: `⏳ Running ${language} code...` 
      }, { quoted: msg });

      const result = await runCode(language, code);
      const output = formatCodeOutput(result, language);

      await sock.sendMessage(from, { 
        text: output 
      }, { quoted: msg });
    } catch (err) {
      console.error('Code runner error:', err);
      await sock.sendMessage(from, { 
        text: `❌ An error occurred while trying to run the code:\n${err.message}` 
      }, { quoted: msg });
    }
  }
};
