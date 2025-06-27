import chalk from "chalk";
import type { StatsOptions } from "../types";
import { DataLoader } from "../data-loader";
import { formatTokenCount } from "../utils/color-utils";

/**
 * Generates detailed usage statistics from Claude usage data.
 * Provides comprehensive analytics including token consumption,
 * cost analysis, model usage breakdown, and daily usage patterns.
 * Supports date range filtering for focused analysis.
 */
export const statsCommand = async (options: StatsOptions): Promise<void> => {
  try {
    const loader = new DataLoader(options.dataDir);
    const entries = await loader.loadUsageData();

    if (entries.length === 0) {
      console.log(
        "No Claude usage data found. Make sure Claude Code is generating logs in the expected directory."
      );
      console.log(
        `Looking for JSONL files in: ${options.dataDir || "~/.claude/projects"}`
      );
      return;
    }

    const filteredEntries = loader.filterByDateRange(entries, options.from, options.to);

    if (filteredEntries.length === 0) {
      console.log("No entries found for the specified date range.");
      return;
    }

    const stats = calculateUsageStatistics(filteredEntries, loader);
    displayStatistics(stats);
  } catch (error) {
    console.error("Error generating statistics:", error);
    process.exit(1);
  }
};

/**
 * Statistics data structure for organized display.
 */
interface UsageStatistics {
  totalEntries: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  firstDate?: string;
  lastDate?: string;
  dailyUsage: Array<{ date: string; totalTokens: number }>;
  avgDailyTokens: number;
  maxDailyTokens: number;
  maxDailyDate?: string;
  modelBreakdown: Map<string, { count: number; tokens: number }>;
}

/**
 * Calculates comprehensive usage statistics from filtered entries.
 */
const calculateUsageStatistics = (filteredEntries: any[], loader: any): UsageStatistics => {
  const totalEntries = filteredEntries.length;
  const totalInputTokens = filteredEntries.reduce(
    (sum, entry) => sum + (entry.message?.usage?.input_tokens || 0),
    0
  );
  const totalOutputTokens = filteredEntries.reduce(
    (sum, entry) => sum + (entry.message?.usage?.output_tokens || 0),
    0
  );
  const totalTokens = totalInputTokens + totalOutputTokens;
  const totalCost = filteredEntries.reduce(
    (sum, entry) => sum + (entry.costUSD || 0),
    0
  );

  // Date range calculation
  const dates = filteredEntries.map((entry) => entry.timestamp).sort();
  const firstDate = dates[0]?.split("T")[0];
  const lastDate = dates[dates.length - 1]?.split("T")[0];

  // Model usage breakdown
  const modelBreakdown = new Map<string, { count: number; tokens: number }>();
  
  for (const entry of filteredEntries) {
    const model = entry.message?.model || "unknown";
    const tokens = (entry.message?.usage?.input_tokens || 0) + (entry.message?.usage?.output_tokens || 0);

    const existing = modelBreakdown.get(model) || { count: 0, tokens: 0 };
    modelBreakdown.set(model, {
      count: existing.count + 1,
      tokens: existing.tokens + tokens,
    });
  }

  // Daily usage analysis
  const dailyUsage = loader.aggregateByDay(filteredEntries);
  const avgDailyTokens = dailyUsage.length > 0 ? totalTokens / dailyUsage.length : 0;
  const maxDailyTokens = Math.max(...dailyUsage.map((day: any) => day.totalTokens));
  const maxDailyDate = dailyUsage.find((day: any) => day.totalTokens === maxDailyTokens)?.date;

  return {
    totalEntries,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    totalCost,
    firstDate,
    lastDate,
    dailyUsage,
    avgDailyTokens,
    maxDailyTokens,
    maxDailyDate,
    modelBreakdown,
  };
};

/**
 * Displays formatted statistics to the console.
 */
const displayStatistics = (stats: UsageStatistics): void => {
  console.log("");
  console.log(chalk.bold("Claude Usage Statistics"));
  console.log(chalk.gray("─".repeat(50)));

  // Date range
  if (stats.firstDate && stats.lastDate) {
    if (stats.firstDate === stats.lastDate) {
      console.log(`${chalk.cyan("Date:")} ${stats.firstDate}`);
    } else {
      console.log(`${chalk.cyan("Date Range:")} ${stats.firstDate} to ${stats.lastDate}`);
    }
  }

  console.log(`${chalk.cyan("Total Conversations:")} ${stats.totalEntries.toLocaleString()}`);
  console.log(`${chalk.cyan("Active Days:")} ${stats.dailyUsage.length}`);
  console.log("");

  // Token statistics
  console.log(chalk.bold("Token Usage"));
  console.log(
    `${chalk.cyan("Input Tokens:")} ${formatTokenCount(stats.totalInputTokens)} (${stats.totalInputTokens.toLocaleString()})`
  );
  console.log(
    `${chalk.cyan("Output Tokens:")} ${formatTokenCount(stats.totalOutputTokens)} (${stats.totalOutputTokens.toLocaleString()})`
  );
  console.log(
    `${chalk.cyan("Total Tokens:")} ${chalk.green(formatTokenCount(stats.totalTokens))} (${stats.totalTokens.toLocaleString()})`
  );
  console.log("");

  // Daily averages
  console.log(chalk.bold("Daily Averages"));
  console.log(`${chalk.cyan("Average Daily Tokens:")} ${formatTokenCount(Math.round(stats.avgDailyTokens))}`);
  console.log(
    `${chalk.cyan("Peak Daily Usage:")} ${formatTokenCount(stats.maxDailyTokens)} ${
      stats.maxDailyDate ? `(${stats.maxDailyDate})` : ""
    }`
  );
  console.log("");

  // Cost information (if available)
  if (stats.totalCost > 0) {
    console.log(chalk.bold("Cost Information"));
    console.log(`${chalk.cyan("Total Cost:")} $${stats.totalCost.toFixed(4)}`);
    console.log(
      `${chalk.cyan("Average Cost per Day:")} $${(stats.totalCost / Math.max(stats.dailyUsage.length, 1)).toFixed(4)}`
    );
    console.log("");
  }

  // Model breakdown
  if (stats.modelBreakdown.size > 0) {
    console.log(chalk.bold("Model Usage"));
    const sortedModels = Array.from(stats.modelBreakdown.entries()).sort(
      (a, b) => b[1].tokens - a[1].tokens
    );

    for (const [model, data] of sortedModels) {
      const percentage = ((data.tokens / stats.totalTokens) * 100).toFixed(1);
      console.log(
        `${chalk.cyan(model)}: ${formatTokenCount(data.tokens)} tokens (${percentage}%) - ${data.count} conversations`
      );
    }
  }

  console.log("");
};
