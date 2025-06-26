// Markdown utilities for Claude CLI

import chalk from 'chalk';
import marked from 'marked';
import { MarkdownOptions } from '../types';

export class MarkdownRenderer {
  private options: MarkdownOptions;

  constructor(options: MarkdownOptions = {}) {
    this.options = {
      wrap: true,
      width: process.stdout.columns || 80,
      indent: 0,
      ...options
    };
  }

  render(markdown: string): string {
    // Create a custom renderer
    const renderer = new marked.Renderer();

    // Customize rendering for terminal output
    renderer.heading = (text, level) => {
      const formatted = level === 1 
        ? chalk.bold.underline(text)
        : level === 2 
        ? chalk.bold(text)
        : chalk.italic(text);
      return '\n' + formatted + '\n';
    };

    renderer.code = (code, language) => {
      const lines = code.split('\n');
      const formatted = lines.map(line => 
        '  ' + chalk.gray('│ ') + chalk.cyan(line)
      ).join('\n');
      return '\n' + chalk.gray('  ┌─ ' + (language || 'code')) + '\n' + formatted + '\n' + chalk.gray('  └─') + '\n';
    };

    renderer.codespan = (code) => {
      return chalk.bgGray.white(` ${code} `);
    };

    renderer.strong = (text) => {
      return chalk.bold(text);
    };

    renderer.em = (text) => {
      return chalk.italic(text);
    };

    renderer.link = (href, title, text) => {
      return chalk.blue.underline(text) + chalk.gray(` (${href})`);
    };

    renderer.list = (body, ordered) => {
      return '\n' + body + '\n';
    };

    renderer.listitem = (text) => {
      return '  • ' + text + '\n';
    };

    renderer.paragraph = (text) => {
      if (this.options.wrap) {
        const width = this.options.width || 80;
        const indent = this.options.indent || 0;
        return this.wrapText(text, width - indent) + '\n';
      }
      return text + '\n';
    };

    renderer.blockquote = (quote) => {
      const lines = quote.trim().split('\n');
      return lines.map(line => chalk.gray('  │ ') + chalk.dim(line)).join('\n') + '\n';
    };

    // Parse and render
    marked.setOptions({
      renderer: renderer,
      breaks: true,
      gfm: true
    });

    const rendered = marked(markdown);
    
    // Apply indentation if needed
    const indentLevel = this.options.indent || 0;
    if (indentLevel > 0) {
      const indent = ' '.repeat(indentLevel);
      return rendered.split('\n').map(line => indent + line).join('\n');
    }

    return rendered;
  }

  private wrapText(text: string, width: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 > width) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += (currentLine ? ' ' : '') + word;
      }
    }

    if (currentLine) {
      lines.push(currentLine.trim());
    }

    return lines.join('\n');
  }

  static renderCodeBlock(code: string, language?: string): string {
    const renderer = new MarkdownRenderer();
    return renderer.render('```' + (language || '') + '\n' + code + '\n```');
  }

  static renderInline(text: string): string {
    // Simple inline rendering without full markdown parsing
    return text
      .replace(/`([^`]+)`/g, (_, code) => chalk.bgGray.white(` ${code} `))
      .replace(/\*\*([^*]+)\*\*/g, (_, text) => chalk.bold(text))
      .replace(/\*([^*]+)\*/g, (_, text) => chalk.italic(text));
  }
} 