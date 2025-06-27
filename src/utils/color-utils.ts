import chalk from 'chalk';

// GitHub-style contribution levels (0-4)
export function getContributionLevel(tokens: number, maxTokens: number): number {
  if (tokens === 0) return 0;
  
  const percentage = tokens / maxTokens;
  
  if (percentage >= 0.75) return 4;
  if (percentage >= 0.50) return 3;
  if (percentage >= 0.25) return 2;
  return 1;
}

// Terminal colors for contribution levels
export function getTerminalColor(level: number): chalk.Chalk {
  switch (level) {
    case 0: return chalk.gray;
    case 1: return chalk.green;
    case 2: return chalk.greenBright;
    case 3: return chalk.hex('#40c463'); // Bright green
    case 4: return chalk.hex('#30a14e'); // Dark green
    default: return chalk.gray;
  }
}

// SVG colors for contribution levels
export function getSvgColor(level: number): string {
  switch (level) {
    case 0: return '#ebedf0';
    case 1: return '#9be9a8';
    case 2: return '#40c463';
    case 3: return '#30a14e';
    case 4: return '#216e39';
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