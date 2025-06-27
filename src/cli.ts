#!/usr/bin/env node

/**
 * Claude Contributions CLI
 * 
 * A command-line tool for generating GitHub-style contribution maps from Claude usage data.
 * Reads Claude Code JSONL logs and creates visual representations of daily usage patterns
 * in both terminal and SVG formats. Supports custom date ranges and detailed statistics.
 */

import { Command } from "commander";
import { showCommand } from "./commands/show";
import { statsCommand } from "./commands/stats";
import { getDefaultYear, parseMonth } from "./utils/date-utils";

/**
 * Parses and validates command-line options for the show command.
 */
const parseShowOptions = (options: any) => {
  let startMonth: number | undefined;

  if (options.startMonth) {
    try {
      startMonth = parseMonth(options.startMonth);
    } catch (error) {
      console.error(
        `Error: ${error instanceof Error ? error.message : "Invalid start month"}`
      );
      process.exit(1);
    }
  }

  return {
    year: options.year ? parseInt(options.year, 10) : undefined,
    startMonth,
    format: options.format as "terminal" | "svg",
    dataDir: options.dataDir,
  };
};

const program = new Command();

program
  .name("claude-contribs")
  .description("Generate GitHub-style contribution maps for Claude usage")
  .version("1.0.0");

program
  .command("show")
  .description("Display contribution map")
  .option(
    "-y, --year <year>",
    "Year to display (default: current year)",
    String(getDefaultYear())
  )
  .option(
    "-s, --start-month <month>",
    "Starting month (1-12 or name, default: January)"
  )
  .option("-f, --format <format>", "Output format (terminal|svg)", "terminal")
  .option(
    "-d, --data-dir <dir>",
    "Claude data directory (default: ~/.claude/projects)"
  )
  .action(async (options) => {
    const parsedOptions = parseShowOptions(options);
    await showCommand(parsedOptions);
  });

program
  .command("stats")
  .description("Show usage statistics")
  .option("--from <date>", "Start date (YYYY-MM-DD)")
  .option("--to <date>", "End date (YYYY-MM-DD)")
  .option(
    "-d, --data-dir <dir>",
    "Claude data directory (default: ~/.claude/projects)"
  )
  .action(async (options) => {
    await statsCommand({
      from: options.from,
      to: options.to,
      dataDir: options.dataDir,
    });
  });

// Default command is show
program.action(async () => {
  await showCommand({});
});

program.parse();
