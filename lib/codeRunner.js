import { python, node, java, c, cpp } from 'compile-run';

export async function runCode(language, code) {
  try {
    let result;
    
    switch(language.toLowerCase()) {
      case 'python':
      case 'py':
        result = await python.runSource(code);
        break;
      case 'javascript':
      case 'js':
      case 'node':
        result = await node.runSource(code);
        break;
      case 'java':
        result = await java.runSource(code);
        break;
      case 'c':
        result = await c.runSource(code);
        break;
      case 'c++':
      case 'cpp':
        result = await cpp.runSource(code);
        break;
      default:
        return {
          success: false,
          error: `Unsupported language: ${language}. Supported: python, javascript, java, c, c++`
        };
    }

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      stdout: result.stdout || '',
      stderr: result.stderr || ''
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

export function formatCodeOutput(result, language) {
  if (!result.success) {
    return `❌ *${language.toUpperCase()} Error*\n\n${result.error}`;
  }

  let output = `✅ *${language.toUpperCase()} Output*\n\n`;
  
  if (result.stdout) {
    output += `📤 *Output:*\n${result.stdout}`;
  }
  
  if (result.stderr) {
    output += `\n\n⚠️ *Warnings:*\n${result.stderr}`;
  }

  if (!result.stdout && !result.stderr) {
    output += '_No output produced_';
  }

  return output;
}
