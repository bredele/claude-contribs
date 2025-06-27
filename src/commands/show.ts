import { writeFile } from "fs/promises";
import type { ShowOptions } from "../types";
import { DataLoader } from "../data-loader";
import { ContributionVisualizer } from "../visualizer";
import { getDefaultYear } from "../utils/date-utils";

/**
 * Generates and displays Claude usage contribution maps.
 * Creates GitHub-style visualizations showing daily Claude usage patterns,
 * supporting both terminal display and SVG export formats.
 * Can display full calendar years or custom 12-month periods.
 */
export const showCommand = async (options: ShowOptions): Promise<void> => {
  const year = options.year || getDefaultYear();
  const startMonth = options.startMonth || 1;
  const format = options.format || "terminal";

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

    const startDate = new Date(year, startMonth - 1, 1);
    const endDate = new Date(year + 1, startMonth - 1, 0);

    const rangeEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    });

    if (rangeEntries.length === 0) {
      const dateRangeStr = generateDateRangeString(year, startMonth);
      console.log(`No Claude usage data found for ${dateRangeStr}.`);
      return;
    }

    const dailyUsage = loader.aggregateByDay(rangeEntries);
    const visualizer = new ContributionVisualizer();
    const map = visualizer.generateContributionMap(
      dailyUsage,
      year,
      startMonth
    );

    if (format === "terminal") {
      const output = visualizer.renderTerminal(map);
      console.log(output);
    } else if (format === "svg") {
      const svg = visualizer.renderSvg(map);
      const filename = generateSvgFilename(year, startMonth);
      await writeFile(filename, svg);
      console.log(`SVG file saved: ${filename}`);
    }
  } catch (error) {
    console.error("Error generating contribution map:", error);
    process.exit(1);
  }
};

/**
 * Generates a user-friendly date range string for display in error messages.
 */
const generateDateRangeString = (year: number, startMonth: number): string => {
  if (startMonth === 1) {
    return `year ${year}`;
  }
  
  const startDate = new Date(year, startMonth - 1);
  const endDate = new Date(year + 1, startMonth - 2);
  
  return `${startDate.toLocaleDateString("en-US", { 
    month: "long", 
    year: "numeric" 
  })} - ${endDate.toLocaleDateString("en-US", { 
    month: "long", 
    year: "numeric" 
  })}`;
};

/**
 * Generates the appropriate filename for SVG exports based on the date range.
 */
const generateSvgFilename = (year: number, startMonth: number): string => {
  if (startMonth === 1) {
    return `claude-contributions-${year}.svg`;
  }
  
  return `claude-contributions-${year}-${startMonth.toString().padStart(2, "0")}.svg`;
};
