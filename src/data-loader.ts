import { readFile, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { homedir } from 'os';
import { usageEntrySchema, type UsageEntry, type DailyUsage } from './types.js';
import { formatDate } from './utils/date-utils.js';

// Default Claude Code data directory
const DEFAULT_CLAUDE_DATA_DIR = join(homedir(), '.local', 'share', 'claude-code');

export class DataLoader {
  constructor(private dataDir: string = DEFAULT_CLAUDE_DATA_DIR) {}

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
      console.warn(`Warning: Could not load usage data from ${this.dataDir}:`, error);
      return [];
    }
  }

  private async findJsonlFiles(): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const dirEntries = await readdir(this.dataDir, { withFileTypes: true });
      
      for (const entry of dirEntries) {
        const fullPath = join(this.dataDir, entry.name);
        
        if (entry.isFile() && extname(entry.name) === '.jsonl') {
          files.push(fullPath);
        } else if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.findJsonlFilesInDirectory(fullPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      throw new Error(`Cannot access data directory: ${this.dataDir}`);
    }
    
    return files;
  }

  private async findJsonlFilesInDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isFile() && extname(entry.name) === '.jsonl') {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return files;
  }

  private async parseJsonlFile(filePath: string): Promise<UsageEntry[]> {
    const entries: UsageEntry[] = [];
    
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          const parsed = usageEntrySchema.safeParse(json);
          
          if (parsed.success) {
            entries.push(parsed.data);
          }
        } catch (error) {
          // Skip invalid JSON lines
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}:`, error);
    }
    
    return entries;
  }

  private deduplicateEntries(entries: UsageEntry[]): UsageEntry[] {
    const seen = new Set<string>();
    const unique: UsageEntry[] = [];
    
    for (const entry of entries) {
      // Create deduplication key from requestId and messageId
      const key = `${entry.requestId || ''}-${entry.message.id || ''}-${entry.timestamp}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(entry);
      }
    }
    
    return unique;
  }

  aggregateByDay(entries: UsageEntry[]): DailyUsage[] {
    const dailyMap = new Map<string, DailyUsage>();
    
    for (const entry of entries) {
      const date = formatDate(new Date(entry.timestamp));
      const totalTokens = entry.message.usage.input_tokens + entry.message.usage.output_tokens;
      
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
    
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  filterByDateRange(entries: UsageEntry[], from?: string, to?: string): UsageEntry[] {
    return entries.filter(entry => {
      const entryDate = formatDate(new Date(entry.timestamp));
      
      if (from && entryDate < from) return false;
      if (to && entryDate > to) return false;
      
      return true;
    });
  }
}