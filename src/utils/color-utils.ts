import chalk, { type ChalkInstance } from 'chalk';

// Anthropic Claude-style contribution levels (0-4)
export function getContributionLevel(tokens: number, maxTokens: number): number {
  if (tokens === 0) return 0;
  
  const percentage = tokens / maxTokens;
  
  if (percentage >= 0.75) return 4;
  if (percentage >= 0.50) return 3;
  if (percentage >= 0.25) return 2;
  return 1;
}

// Terminal colors for contribution levels (Claude orange/brown theme)
export function getTerminalColor(level: number): ChalkInstance {
  switch (level) {
    case 0: return chalk.gray;
    case 1: return chalk.hex('#f4a261'); // Light orange
    case 2: return chalk.hex('#e76f51'); // Medium orange
    case 3: return chalk.hex('#d4621e'); // Dark orange
    case 4: return chalk.hex('#b8440f'); // Deep orange/brown
    default: return chalk.gray;
  }
}

// SVG colors for contribution levels (Claude orange/brown theme)
export function getSvgColor(level: number): string {
  switch (level) {
    case 0: return '#ebedf0';        // Light gray (no activity)
    case 1: return '#fde2b3';        // Very light orange
    case 2: return '#f4a261';        // Light orange  
    case 3: return '#e76f51';        // Medium orange
    case 4: return '#d4621e';        // Dark orange
    default: return '#ebedf0';
  }
}

// Format large numbers with K/M suffixes
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}