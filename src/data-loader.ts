import { readFile, readdir } from "fs/promises";
import { join, extname } from "path";
import { homedir } from "os";
import { usageEntrySchema, type UsageEntry, type DailyUsage } from "./types";
import { formatDate } from "./utils/date-utils";

/**
 * Default directory where Claude Code stores usage logs.
 * This matches the standard Claude Code installation path.
 */
const DEFAULT_CLAUDE_DATA_DIR = join(homedir(), ".claude", "projects");

/**
 * File extension for Claude Code JSONL (JSON Lines) log files.
 */
const JSONL_EXTENSION = ".jsonl";

/**
 * Handles loading and processing Claude usage data from JSONL files.
 * Responsible for finding log files, parsing entries, deduplication,
 * and aggregating usage data for visualization in contribution maps.
 */
export class DataLoader {
  constructor(private dataDir: string = DEFAULT_CLAUDE_DATA_DIR) {}

  /**
   * Loads all Claude usage entries from JSONL files in the data directory.
   * Automatically discovers files, parses entries, and deduplicates data
   * to provide a clean dataset for contribution map generation.
   */
  async loadUsageData(): Promise<UsageEntry[]> {
    const entries: UsageEntry[] = [];

    try {
      const files = await this.findJsonlFiles();

      for (const file of files) {
        const fileEntries = await this.parseJsonlFile(file);
        entries.push(...fileEntries);
      }

      // Deduplicate entries by requestId and messageId
      return this.deduplicateEntries(entries);
    } catch (error) {
      console.warn(
        `Warning: Could not load usage data from ${this.dataDir}:`,
        error
      );
      return [];
    }
  }

  /**
   * Recursively searches for JSONL files in the data directory.
   * Traverses subdirectories to find all Claude usage log files.
   */
  private async findJsonlFiles(): Promise<string[]> {
    const files: string[] = [];

    try {
      const dirEntries = await readdir(this.dataDir, { withFileTypes: true });

      for (const entry of dirEntries) {
        const fullPath = join(this.dataDir, entry.name);

        if (entry.isFile() && extname(entry.name) === JSONL_EXTENSION) {
          files.push(fullPath);
        } else if (entry.isDirectory()) {
          const subFiles = await this.findJsonlFilesInDirectory(fullPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      throw new Error(`Cannot access data directory: ${this.dataDir}`);
    }

    return files;
  }

  /**
   * Searches for JSONL files within a specific directory (non-recursive).
   * Used to scan subdirectories found during the main file discovery process.
   */
  private async findJsonlFilesInDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isFile() && extname(entry.name) === JSONL_EXTENSION) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Silently skip directories we can't access
    }

    return files;
  }

  /**
   * Parses a single JSONL file and extracts valid Claude usage entries.
   * Validates each line against the usage schema and filters out invalid entries.
   */
  private async parseJsonlFile(filePath: string): Promise<UsageEntry[]> {
    const entries: UsageEntry[] = [];

    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          const parsed = usageEntrySchema.safeParse(json);

          if (parsed.success) {
            entries.push(parsed.data);
          }
        } catch (error) {
          // Silently skip invalid JSON lines
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}:`, error);
    }

    return entries;
  }

  /**
   * Removes duplicate entries based on request ID, message ID, and timestamp.
   * Claude logs may contain duplicate entries, so deduplication ensures
   * accurate usage statistics and prevents inflated token counts.
   */
  private deduplicateEntries(entries: UsageEntry[]): UsageEntry[] {
    const seen = new Set<string>();
    const unique: UsageEntry[] = [];

    for (const entry of entries) {
      const key = `${entry.requestId || ""}-${entry.message?.id || ""}-${entry.timestamp}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(entry);
      }
    }

    return unique;
  }

  /**
   * Aggregates usage entries by day to create daily usage summaries.
   * Combines all entries for each date into totals suitable for
   * generating the contribution map visualization.
   */
  aggregateByDay(entries: UsageEntry[]): DailyUsage[] {
    const dailyMap = new Map<string, DailyUsage>();

    for (const entry of entries) {
      if (!entry.message?.usage) continue;

      const date = formatDate(new Date(entry.timestamp));
      const totalTokens =
        entry.message.usage.input_tokens + entry.message.usage.output_tokens;

      if (dailyMap.has(date)) {
        const existing = dailyMap.get(date)!;
        existing.totalTokens += totalTokens;
        existing.inputTokens += entry.message.usage.input_tokens;
        existing.outputTokens += entry.message.usage.output_tokens;
        existing.totalCost += entry.costUSD || 0;
        existing.entryCount += 1;
      } else {
        dailyMap.set(date, {
          date,
          totalTokens,
          inputTokens: entry.message.usage.input_tokens,
          outputTokens: entry.message.usage.output_tokens,
          totalCost: entry.costUSD || 0,
          entryCount: 1,
        });
      }
    }

    return Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  /**
   * Filters usage entries to only include those within a specified date range.
   * Used for generating statistics and visualizations for specific time periods.
   */
  filterByDateRange(
    entries: UsageEntry[],
    from?: string,
    to?: string
  ): UsageEntry[] {
    return entries.filter((entry) => {
      const entryDate = formatDate(new Date(entry.timestamp));

      if (from && entryDate < from) return false;
      if (to && entryDate > to) return false;

      return true;
    });
  }
}
