import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function runShellCommand(command) {
  try {
    const { stdout, stderr } = await execPromise(command, {
      timeout: 30000,
      maxBuffer: 1024 * 1024
    });

    return {
      success: true,
      stdout: stdout || '',
      stderr: stderr || ''
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      stdout: err.stdout || '',
      stderr: err.stderr || ''
    };
  }
}

export function formatShellOutput(result, command) {
  let output = `*🐚 Shell Command*\n\n*Command:* \`${command}\`\n\n`;
  
  if (!result.success) {
    output += `❌ *Error:*\n${result.error}`;
    if (result.stderr) {
      output += `\n\n*Stderr:*\n${result.stderr}`;
    }
    if (result.stdout) {
      output += `\n\n*Stdout:*\n${result.stdout}`;
    }
    return output;
  }

  if (result.stdout) {
    output += `✅ *Output:*\n\`\`\`\n${result.stdout}\n\`\`\``;
  }
  
  if (result.stderr) {
    output += `\n\n⚠️ *Warnings:*\n\`\`\`\n${result.stderr}\n\`\`\``;
  }

  if (!result.stdout && !result.stderr) {
    output += '✅ _Command executed successfully (no output)_';
  }

  return output;
}

export function isSafeCommand(command) {
  const dangerousCommands = [
    'rm -rf',
    'mkfs',
    'dd if=',
    ':(){:|:&};:',
    'chmod -R 777',
    '> /dev/sda',
    'mv /* ',
    'wget http',
    'curl http',
    'shutdown',
    'reboot',
    'halt',
    'poweroff'
  ];

  const lowerCommand = command.toLowerCase();
  return !dangerousCommands.some(dangerous => lowerCommand.includes(dangerous));
}
