import { writeFile } from 'fs/promises';
import type { ShowOptions } from '../types.js';
import { DataLoader } from '../data-loader.js';
import { ContributionVisualizer } from '../visualizer.js';
import { getDefaultYear } from '../utils/date-utils.js';

export async function showCommand(options: ShowOptions): Promise<void> {
  const year = options.year || getDefaultYear();
  const format = options.format || 'terminal';
  
  try {
    // Load data
    const loader = new DataLoader(options.dataDir);
    const entries = await loader.loadUsageData();
    
    if (entries.length === 0) {
      console.log('No Claude usage data found. Make sure Claude Code is generating logs in the expected directory.');
      console.log(`Looking for JSONL files in: ${options.dataDir || '~/.claude/projects'}`);
      return;
    }
    
    // Filter entries for the specified year
    const yearEntries = entries.filter(entry => {
      const entryYear = new Date(entry.timestamp).getFullYear();
      return entryYear === year;
    });
    
    if (yearEntries.length === 0) {
      console.log(`No Claude usage data found for year ${year}.`);
      return;
    }
    
    // Aggregate by day
    const dailyUsage = loader.aggregateByDay(yearEntries);
    
    // Generate contribution map
    const visualizer = new ContributionVisualizer();
    const map = visualizer.generateContributionMap(dailyUsage, year);
    
    // Render based on format
    if (format === 'terminal') {
      const output = visualizer.renderTerminal(map);
      console.log(output);
    } else if (format === 'svg') {
      const svg = visualizer.renderSvg(map);
      const filename = `claude-contributions-${year}.svg`;
      await writeFile(filename, svg);
      console.log(`SVG file saved: ${filename}`);
    }
    
  } catch (error) {
    console.error('Error generating contribution map:', error);
    process.exit(1);
  }
}