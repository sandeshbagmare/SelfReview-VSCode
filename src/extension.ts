import * as vscode from 'vscode';
import { ReviewPanel } from './panel/ReviewPanel';

export function activate(context: vscode.ExtensionContext) {
  console.log('SelfReview extension activated');

  // Register the main command to open the review panel
  const openCommand = vscode.commands.registerCommand('selfreview.open', () => {
    ReviewPanel.createOrShow(context);
  });

  // Register command to set API keys
  const setOpenAIKeyCommand = vscode.commands.registerCommand('selfreview.setOpenAIKey', async () => {
    const key = await vscode.window.showInputBox({
      prompt: 'Enter your OpenAI API key',
      password: true,
      ignoreFocusOut: true
    });

    if (key) {
      await context.secrets.store('selfreview.openai', key);
      vscode.window.showInformationMessage('OpenAI API key saved');
    }
  });

  const setAnthropicKeyCommand = vscode.commands.registerCommand('selfreview.setAnthropicKey', async () => {
    const key = await vscode.window.showInputBox({
      prompt: 'Enter your Anthropic API key',
      password: true,
      ignoreFocusOut: true
    });

    if (key) {
      await context.secrets.store('selfreview.anthropic', key);
      vscode.window.showInformationMessage('Anthropic API key saved');
    }
  });

  context.subscriptions.push(openCommand, setOpenAIKeyCommand, setAnthropicKeyCommand);
}

export function deactivate() {}
