import { writeFile } from 'fs/promises';
import type { ShowOptions } from '../types.js';
import { DataLoader } from '../data-loader.js';
import { ContributionVisualizer } from '../visualizer.js';
import { getDefaultYear } from '../utils/date-utils.js';

export async function showCommand(options: ShowOptions): Promise<void> {
  const year = options.year || getDefaultYear();
  const startMonth = options.startMonth || 1;
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
    
    // Filter entries for the specified date range
    const startDate = new Date(year, startMonth - 1, 1);
    const endDate = new Date(year + 1, startMonth - 1, 0);
    
    const rangeEntries = entries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    });
    
    if (rangeEntries.length === 0) {
      const dateRangeStr = startMonth === 1 ? `year ${year}` : 
        `${startMonth === 1 ? year : `${new Date(year, startMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - ${new Date(year + 1, startMonth - 2).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}`;
      console.log(`No Claude usage data found for ${dateRangeStr}.`);
      return;
    }
    
    // Aggregate by day
    const dailyUsage = loader.aggregateByDay(rangeEntries);
    
    // Generate contribution map
    const visualizer = new ContributionVisualizer();
    const map = visualizer.generateContributionMap(dailyUsage, year, startMonth);
    
    // Render based on format
    if (format === 'terminal') {
      const output = visualizer.renderTerminal(map);
      console.log(output);
    } else if (format === 'svg') {
      const svg = visualizer.renderSvg(map);
      const filename = startMonth === 1 ? 
        `claude-contributions-${year}.svg` : 
        `claude-contributions-${year}-${startMonth.toString().padStart(2, '0')}.svg`;
      await writeFile(filename, svg);
      console.log(`SVG file saved: ${filename}`);
    }
    
  } catch (error) {
    console.error('Error generating contribution map:', error);
    process.exit(1);
  }
}