#!/usr/bin/env node

import { Command } from 'commander';
import { showCommand } from './commands/show.js';
import { statsCommand } from './commands/stats.js';
import { getDefaultYear, parseMonth } from './utils/date-utils.js';

const program = new Command();

program
  .name('claude-contributions')
  .description('Generate GitHub-style contribution maps for Claude usage')
  .version('1.0.0');

program
  .command('show')
  .description('Display contribution map')
  .option('-y, --year <year>', 'Year to display (default: current year)', String(getDefaultYear()))
  .option('-s, --start-month <month>', 'Starting month (1-12 or name, default: January)')
  .option('-f, --format <format>', 'Output format (terminal|svg)', 'terminal')
  .option('-d, --data-dir <dir>', 'Claude data directory (default: ~/.claude/projects)')
  .action(async (options) => {
    let startMonth: number | undefined;
    
    if (options.startMonth) {
      try {
        startMonth = parseMonth(options.startMonth);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : 'Invalid start month'}`);
        process.exit(1);
      }
    }
    
    const parsedOptions = {
      year: options.year ? parseInt(options.year, 10) : undefined,
      startMonth,
      format: options.format as 'terminal' | 'svg',
      dataDir: options.dataDir,
    };
    
    await showCommand(parsedOptions);
  });

program
  .command('stats')
  .description('Show usage statistics')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .option('-d, --data-dir <dir>', 'Claude data directory (default: ~/.claude/projects)')
  .action(async (options) => {
    await statsCommand({
      from: options.from,
      to: options.to,
      dataDir: options.dataDir,
    });
  });

// Default command is show
program
  .action(async () => {
    await showCommand({});
  });

program.parse();