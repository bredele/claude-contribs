import chalk from 'chalk';
import type { StatsOptions } from '../types.js';
import { DataLoader } from '../data-loader.js';
import { formatTokenCount } from '../utils/color-utils.js';

export async function statsCommand(options: StatsOptions): Promise<void> {
  try {
    // Load data
    const loader = new DataLoader(options.dataDir);
    const entries = await loader.loadUsageData();
    
    if (entries.length === 0) {
      console.log('No Claude usage data found. Make sure Claude Code is generating logs in the expected directory.');
      console.log(`Looking for JSONL files in: ${options.dataDir || '~/.local/share/claude-code'}`);
      return;
    }
    
    // Filter by date range if specified
    const filteredEntries = loader.filterByDateRange(entries, options.from, options.to);
    
    if (filteredEntries.length === 0) {
      console.log('No entries found for the specified date range.');
      return;
    }
    
    // Calculate statistics
    const totalEntries = filteredEntries.length;
    const totalInputTokens = filteredEntries.reduce((sum, entry) => sum + entry.message.usage.input_tokens, 0);
    const totalOutputTokens = filteredEntries.reduce((sum, entry) => sum + entry.message.usage.output_tokens, 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const totalCost = filteredEntries.reduce((sum, entry) => sum + (entry.costUSD || 0), 0);
    
    // Get date range
    const dates = filteredEntries.map(entry => entry.timestamp).sort();
    const firstDate = dates[0]?.split('T')[0];
    const lastDate = dates[dates.length - 1]?.split('T')[0];
    
    // Model breakdown
    const modelCounts = new Map<string, number>();
    const modelTokens = new Map<string, number>();
    
    for (const entry of filteredEntries) {
      const model = entry.message.model || 'unknown';
      const tokens = entry.message.usage.input_tokens + entry.message.usage.output_tokens;
      
      modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
      modelTokens.set(model, (modelTokens.get(model) || 0) + tokens);
    }
    
    // Daily usage
    const dailyUsage = loader.aggregateByDay(filteredEntries);
    const avgDailyTokens = dailyUsage.length > 0 ? totalTokens / dailyUsage.length : 0;
    const maxDailyTokens = Math.max(...dailyUsage.map(day => day.totalTokens));
    const maxDailyDate = dailyUsage.find(day => day.totalTokens === maxDailyTokens)?.date;
    
    // Display statistics
    console.log('');
    console.log(chalk.bold('Claude Usage Statistics'));
    console.log(chalk.gray('─'.repeat(50)));
    
    // Date range
    if (firstDate && lastDate) {
      if (firstDate === lastDate) {
        console.log(`${chalk.cyan('Date:')} ${firstDate}`);
      } else {
        console.log(`${chalk.cyan('Date Range:')} ${firstDate} to ${lastDate}`);
      }
    }
    
    console.log(`${chalk.cyan('Total Conversations:')} ${totalEntries.toLocaleString()}`);
    console.log(`${chalk.cyan('Active Days:')} ${dailyUsage.length}`);
    console.log('');
    
    // Token statistics
    console.log(chalk.bold('Token Usage'));
    console.log(`${chalk.cyan('Input Tokens:')} ${formatTokenCount(totalInputTokens)} (${totalInputTokens.toLocaleString()})`);
    console.log(`${chalk.cyan('Output Tokens:')} ${formatTokenCount(totalOutputTokens)} (${totalOutputTokens.toLocaleString()})`);
    console.log(`${chalk.cyan('Total Tokens:')} ${chalk.green(formatTokenCount(totalTokens))} (${totalTokens.toLocaleString()})`);
    console.log('');
    
    // Daily averages
    console.log(chalk.bold('Daily Averages'));
    console.log(`${chalk.cyan('Average Daily Tokens:')} ${formatTokenCount(Math.round(avgDailyTokens))}`);
    console.log(`${chalk.cyan('Peak Daily Usage:')} ${formatTokenCount(maxDailyTokens)} ${maxDailyDate ? `(${maxDailyDate})` : ''}`);
    console.log('');
    
    // Cost information (if available)
    if (totalCost > 0) {
      console.log(chalk.bold('Cost Information'));
      console.log(`${chalk.cyan('Total Cost:')} $${totalCost.toFixed(4)}`);
      console.log(`${chalk.cyan('Average Cost per Day:')} $${(totalCost / Math.max(dailyUsage.length, 1)).toFixed(4)}`);
      console.log('');
    }
    
    // Model breakdown
    if (modelCounts.size > 0) {
      console.log(chalk.bold('Model Usage'));
      const sortedModels = Array.from(modelCounts.entries())
        .sort((a, b) => (modelTokens.get(b[0]) || 0) - (modelTokens.get(a[0]) || 0));
      
      for (const [model, count] of sortedModels) {
        const tokens = modelTokens.get(model) || 0;
        const percentage = ((tokens / totalTokens) * 100).toFixed(1);
        console.log(`${chalk.cyan(model)}: ${formatTokenCount(tokens)} tokens (${percentage}%) - ${count} conversations`);
      }
    }
    
    console.log('');
    
  } catch (error) {
    console.error('Error generating statistics:', error);
    process.exit(1);
  }
}