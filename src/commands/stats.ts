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

    const stats = calculateUsageStatistics(filteredEntries, loader, options);
    
    if (options.debug) {
      displayDebugInfo(filteredEntries, options);
    }
    
    if (options.json) {
      outputAsJson(stats);
    } else {
      displayStatistics(stats, options);
    }
  } catch (error) {
    console.error("Error generating statistics:", error);
    process.exit(1);
  }
};

/**
 * Detailed token breakdown per model for cost calculation.
 */
interface ModelTokenBreakdown {
  count: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
}

/**
 * Statistics data structure for organized display.
 */
interface UsageStatistics {
  totalEntries: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheCreationTokens: number;
  totalCacheReadTokens: number;
  totalTokens: number;
  firstDate?: string;
  lastDate?: string;
  dailyUsage: Array<{ date: string; totalTokens: number }>;
  avgDailyTokens: number;
  maxDailyTokens: number;
  maxDailyDate?: string;
  modelBreakdown: Map<string, ModelTokenBreakdown>;
}

/**
 * Calculates comprehensive usage statistics from filtered entries.
 */
const calculateUsageStatistics = (filteredEntries: any[], loader: any, options: StatsOptions): UsageStatistics => {
  const totalEntries = filteredEntries.length;
  
  // Calculate base token counts
  const baseInputTokens = filteredEntries.reduce(
    (sum, entry) => sum + (entry.message?.usage?.input_tokens || 0),
    0
  );
  const totalOutputTokens = filteredEntries.reduce(
    (sum, entry) => sum + (entry.message?.usage?.output_tokens || 0),
    0
  );
  const totalCacheCreationTokens = filteredEntries.reduce(
    (sum, entry) => sum + (entry.message?.usage?.cache_creation_input_tokens || 0),
    0
  );
  const totalCacheReadTokens = filteredEntries.reduce(
    (sum, entry) => sum + (entry.message?.usage?.cache_read_input_tokens || 0),
    0
  );
  
  // Calculate totals based on excludeCache option
  const totalInputTokens = options.excludeCache ? baseInputTokens : baseInputTokens + totalCacheCreationTokens + totalCacheReadTokens;
  const totalTokens = totalInputTokens + totalOutputTokens;

  // Date range calculation
  const dates = filteredEntries.map((entry) => entry.timestamp).sort();
  const firstDate = dates[0]?.split("T")[0];
  const lastDate = dates[dates.length - 1]?.split("T")[0];

  // Model usage breakdown
  const modelBreakdown = new Map<string, ModelTokenBreakdown>();
  
  for (const entry of filteredEntries) {
    const model = entry.message?.model || "unknown";
    const inputTokens = entry.message?.usage?.input_tokens || 0;
    const outputTokens = entry.message?.usage?.output_tokens || 0;
    const cacheCreationTokens = entry.message?.usage?.cache_creation_input_tokens || 0;
    const cacheReadTokens = entry.message?.usage?.cache_read_input_tokens || 0;
    
    let totalTokens = inputTokens + outputTokens;
    if (!options.excludeCache) {
      totalTokens += cacheCreationTokens + cacheReadTokens;
    }

    const existing = modelBreakdown.get(model) || {
      count: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
    };
    
    modelBreakdown.set(model, {
      count: existing.count + 1,
      inputTokens: existing.inputTokens + inputTokens,
      outputTokens: existing.outputTokens + outputTokens,
      cacheCreationTokens: existing.cacheCreationTokens + cacheCreationTokens,
      cacheReadTokens: existing.cacheReadTokens + cacheReadTokens,
      totalTokens: existing.totalTokens + totalTokens,
    });
  }

  // Daily usage analysis
  const dailyUsage = loader.aggregateByDay(filteredEntries, options.excludeCache);
  const avgDailyTokens = dailyUsage.length > 0 ? totalTokens / dailyUsage.length : 0;
  const maxDailyTokens = Math.max(...dailyUsage.map((day: any) => day.totalTokens));
  const maxDailyDate = dailyUsage.find((day: any) => day.totalTokens === maxDailyTokens)?.date;

  return {
    totalEntries,
    totalInputTokens,
    totalOutputTokens,
    totalCacheCreationTokens,
    totalCacheReadTokens,
    totalTokens,
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
 * Outputs statistics as formatted JSON to stdout.
 * Converts Map objects to plain objects for proper JSON serialization.
 */
const outputAsJson = (stats: UsageStatistics): void => {
  const jsonOutput = {
    totalEntries: stats.totalEntries,
    totalInputTokens: stats.totalInputTokens,
    totalOutputTokens: stats.totalOutputTokens,
    totalCacheCreationTokens: stats.totalCacheCreationTokens,
    totalCacheReadTokens: stats.totalCacheReadTokens,
    totalTokens: stats.totalTokens,
    dateRange: {
      firstDate: stats.firstDate,
      lastDate: stats.lastDate,
    },
    dailyMetrics: {
      activeDays: stats.dailyUsage.length,
      avgDailyTokens: Math.round(stats.avgDailyTokens),
      maxDailyTokens: stats.maxDailyTokens,
      maxDailyDate: stats.maxDailyDate,
    },
    modelBreakdown: Object.fromEntries(
      Array.from(stats.modelBreakdown.entries()).map(([model, data]) => [
        model,
        {
          count: data.count,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          cacheCreationTokens: data.cacheCreationTokens,
          cacheReadTokens: data.cacheReadTokens,
          totalTokens: data.totalTokens,
          percentage: Number(((data.totalTokens / stats.totalTokens) * 100).toFixed(1)),
        },
      ])
    ),
    dailyUsage: stats.dailyUsage,
  };

  console.log(JSON.stringify(jsonOutput, null, 2));
};

/**
 * Displays debug information about token calculation.
 */
const displayDebugInfo = (filteredEntries: any[], options: StatsOptions): void => {
  console.log("");
  console.log(chalk.bold("Debug Information"));
  console.log(chalk.gray("─".repeat(50)));
  
  const baseTokens = filteredEntries.reduce((sum, entry) => 
    sum + (entry.message?.usage?.input_tokens || 0) + (entry.message?.usage?.output_tokens || 0), 0);
  const cacheCreationTokens = filteredEntries.reduce((sum, entry) => 
    sum + (entry.message?.usage?.cache_creation_input_tokens || 0), 0);
  const cacheReadTokens = filteredEntries.reduce((sum, entry) => 
    sum + (entry.message?.usage?.cache_read_input_tokens || 0), 0);
  
  console.log(`${chalk.cyan("Base Tokens (input + output):")} ${baseTokens.toLocaleString()}`);
  console.log(`${chalk.cyan("Cache Creation Tokens:")} ${cacheCreationTokens.toLocaleString()}`);
  console.log(`${chalk.cyan("Cache Read Tokens:")} ${cacheReadTokens.toLocaleString()}`);
  console.log(`${chalk.cyan("Total with Cache:")} ${(baseTokens + cacheCreationTokens + cacheReadTokens).toLocaleString()}`);
  console.log(`${chalk.cyan("Mode:")} ${options.excludeCache ? "Excluding cache tokens (ccusage compatible)" : "Including all tokens"}`);
  console.log("");
};

/**
 * Displays formatted statistics to the console.
 */
const displayStatistics = (stats: UsageStatistics, options?: StatsOptions): void => {
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
    `${chalk.cyan("Input Tokens:")} ${formatTokenCount(stats.totalInputTokens - stats.totalCacheCreationTokens - stats.totalCacheReadTokens)} (${(stats.totalInputTokens - stats.totalCacheCreationTokens - stats.totalCacheReadTokens).toLocaleString()})`
  );
  console.log(
    `${chalk.cyan("Output Tokens:")} ${formatTokenCount(stats.totalOutputTokens)} (${stats.totalOutputTokens.toLocaleString()})`
  );
  if (stats.totalCacheCreationTokens > 0) {
    console.log(
      `${chalk.cyan("Cache Creation Tokens:")} ${formatTokenCount(stats.totalCacheCreationTokens)} (${stats.totalCacheCreationTokens.toLocaleString()})`
    );
  }
  if (stats.totalCacheReadTokens > 0) {
    console.log(
      `${chalk.cyan("Cache Read Tokens:")} ${formatTokenCount(stats.totalCacheReadTokens)} (${stats.totalCacheReadTokens.toLocaleString()})`
    );
  }
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

  // Model breakdown
  if (stats.modelBreakdown.size > 0) {
    console.log(chalk.bold("Model Usage"));
    const sortedModels = Array.from(stats.modelBreakdown.entries()).sort(
      (a, b) => b[1].totalTokens - a[1].totalTokens
    );

    for (const [model, data] of sortedModels) {
      const percentage = ((data.totalTokens / stats.totalTokens) * 100).toFixed(1);
      console.log(
        `${chalk.cyan(model)}: ${formatTokenCount(data.totalTokens)} tokens (${percentage}%) - ${data.count} conversations`
      );
    }
  }

  console.log("");
};
