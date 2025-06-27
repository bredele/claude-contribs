import chalk, { type ChalkInstance } from 'chalk';

/**
 * Number of contribution intensity levels used in the visualization.
 * Matches GitHub's contribution map which uses 5 levels (0-4):
 * 0 = no activity, 1 = low, 2 = medium, 3 = high, 4 = very high
 */
const CONTRIBUTION_LEVELS = 5;

/**
 * Thresholds for determining contribution intensity levels.
 * Based on percentage of daily usage relative to the user's peak day.
 */
const LEVEL_THRESHOLDS = {
  VERY_HIGH: 0.75,  // 75%+ of max daily usage
  HIGH: 0.50,       // 50-74% of max daily usage  
  MEDIUM: 0.25,     // 25-49% of max daily usage
  // LOW: anything above 0 but below 25%
  // NONE: 0 usage
} as const;

/**
 * Calculates the contribution intensity level (0-4) for a given token count.
 * Uses Claude's orange/brown color theme to represent different usage intensities.
 * Level 0 represents no activity, while level 4 represents peak usage days.
 */
export const getContributionLevel = (tokens: number, maxTokens: number): number => {
  if (tokens === 0) return 0;
  
  const percentage = tokens / maxTokens;
  
  if (percentage >= LEVEL_THRESHOLDS.VERY_HIGH) return 4;
  if (percentage >= LEVEL_THRESHOLDS.HIGH) return 3;
  if (percentage >= LEVEL_THRESHOLDS.MEDIUM) return 2;
  return 1;
};

/**
 * Maps contribution levels to chalk color functions for terminal display.
 * Uses Anthropic Claude's signature orange/brown color palette to create
 * a visually appealing progression from gray (no activity) to deep orange (high activity).
 */
export const getTerminalColor = (level: number): ChalkInstance => {
  switch (level) {
    case 0: return chalk.gray;
    case 1: return chalk.hex('#f4a261'); // Light orange
    case 2: return chalk.hex('#e76f51'); // Medium orange
    case 3: return chalk.hex('#d4621e'); // Dark orange
    case 4: return chalk.hex('#b8440f'); // Deep orange/brown
    default: return chalk.gray;
  }
};

/**
 * Maps contribution levels to hex colors for SVG export.
 * Provides the same Claude-themed color progression as terminal output
 * but in hex format suitable for SVG graphics and web display.
 */
export const getSvgColor = (level: number): string => {
  switch (level) {
    case 0: return '#ebedf0';        // Light gray (no activity)
    case 1: return '#fde2b3';        // Very light orange
    case 2: return '#f4a261';        // Light orange  
    case 3: return '#e76f51';        // Medium orange
    case 4: return '#d4621e';        // Dark orange
    default: return '#ebedf0';
  }
};

/**
 * Formats large token counts with K/M suffixes for readable display.
 * Converts numbers like 1500 to "1.5K" and 2500000 to "2.5M".
 * Essential for displaying Claude usage statistics in a compact,
 * user-friendly format throughout the application.
 */
export const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
};