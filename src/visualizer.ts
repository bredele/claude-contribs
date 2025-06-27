import chalk from "chalk";
import type {
  DailyUsage,
  ContributionMap,
  ContributionWeek,
  ContributionDay,
} from "./types";
import {
  getWeeksInYear,
  getWeeksInCustomYear,
  getDaysInWeek,
  formatDate,
  getMonthName,
} from "./utils/date-utils";
import {
  getContributionLevel,
  getTerminalColor,
  getSvgColor,
  formatTokenCount,
} from "./utils/color-utils";

/**
 * Configuration constants for SVG rendering layout and styling.
 */
const SVG_CONFIG = {
  CELL_SIZE: 11,
  CELL_GAP: 1,
  CELL_RADIUS: 2,
  MONTH_LABEL_HEIGHT: 15,
  DAY_LABEL_WIDTH: 25,
  MARGIN: 20,
  LEGEND_OFFSET: 25,
  LEGEND_SPACING: 40,
} as const;

/**
 * Month abbreviations used in terminal and SVG displays.
 */
const MONTH_ABBREVIATIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
] as const;

/**
 * Day labels for the contribution grid, showing only Mon/Wed/Fri for clarity.
 */
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] as const;

/**
 * Creates GitHub-style contribution map visualizations from Claude usage data.
 * Generates both terminal ASCII art and SVG export formats, displaying
 * daily usage intensity in a grid layout similar to GitHub's contribution graphs.
 */
export class ContributionVisualizer {
  /**
   * Generates the core contribution map data structure from daily usage statistics.
   * Creates a grid of weeks and days with calculated intensity levels (0-4)
   * based on token usage relative to the user's peak usage day.
   */
  generateContributionMap(
    dailyUsage: DailyUsage[],
    year: number,
    startMonth: number = 1
  ): ContributionMap {
    const weeks =
      startMonth === 1
        ? getWeeksInYear(year)
        : getWeeksInCustomYear(year, startMonth);
    const usageMap = new Map(dailyUsage.map((usage) => [usage.date, usage]));

    let totalTokens = 0;
    let maxDailyTokens = 0;

    // Calculate totals and find peak usage day for intensity scaling
    for (const usage of dailyUsage) {
      totalTokens += usage.totalTokens;
      maxDailyTokens = Math.max(maxDailyTokens, usage.totalTokens);
    }

    const contributionWeeks: ContributionWeek[] = weeks.map((weekStart) => {
      const days = getDaysInWeek(weekStart);
      const contributionDays: ContributionDay[] = days.map((day) => {
        const dateStr = formatDate(day);
        const usage = usageMap.get(dateStr);
        const tokens = usage?.totalTokens || 0;

        return {
          date: dateStr,
          tokens,
          level: getContributionLevel(tokens, maxDailyTokens),
        };
      });

      return { days: contributionDays };
    });

    // Generate display labels for the date range
    const endMonth = startMonth === 1 ? 12 : startMonth - 1;
    const endYear = startMonth === 1 ? year : year + 1;

    let dateRange: string;
    if (startMonth === 1) {
      dateRange = `${year}`;
    } else {
      dateRange = `${getMonthName(startMonth)} ${year} - ${getMonthName(
        endMonth
      )} ${endYear}`;
    }

    return {
      year,
      startMonth,
      endMonth,
      dateRange,
      weeks: contributionWeeks,
      totalTokens,
      maxDailyTokens,
    };
  }

  /**
   * Renders the contribution map as colored ASCII art for terminal display.
   * Uses Unicode block characters and ANSI colors to create a visual representation
   * similar to GitHub's contribution graph, optimized for command-line viewing.
   */
  renderTerminal(map: ContributionMap): string {
    const output: string[] = [];

    // Header with date range and stats
    output.push("");
    output.push(chalk.bold(`Claude Contributions ${map.dateRange}`));
    output.push(
      chalk.gray(
        `Total tokens: ${formatTokenCount(
          map.totalTokens
        )} | Max daily: ${formatTokenCount(map.maxDailyTokens)}`
      )
    );
    output.push("");

    const monthLabels = this.generateMonthLabels(map.startMonth);
    output.push(`     ${monthLabels}`);

    // Render the 7-day grid with day labels and contribution squares
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const label = DAY_LABELS[dayIndex].padEnd(3, " ");
      const row: string[] = [label];

      for (const week of map.weeks) {
        const day = week.days[dayIndex];
        const color = getTerminalColor(day.level);
        row.push(color("■"));
      }

      output.push(row.join(" "));
    }

    output.push("");
    output.push(this.generateLegend());
    output.push("");

    return output.join("\n");
  }

  /**
   * Renders the contribution map as an SVG graphic for export and web display.
   * Creates a scalable vector graphic with the same visual layout as the terminal
   * version, including month labels, day labels, contribution grid, and legend.
   */
  renderSvg(map: ContributionMap): string {
    const gridWidth = map.weeks.length * (SVG_CONFIG.CELL_SIZE + SVG_CONFIG.CELL_GAP);
    const gridHeight = 7 * (SVG_CONFIG.CELL_SIZE + SVG_CONFIG.CELL_GAP);
    const totalWidth = SVG_CONFIG.DAY_LABEL_WIDTH + gridWidth + SVG_CONFIG.MARGIN;
    const totalHeight = SVG_CONFIG.MONTH_LABEL_HEIGHT + gridHeight + SVG_CONFIG.LEGEND_SPACING;

    let svg = `<svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;

    svg += this.renderSvgBackground();
    svg += this.renderSvgHeader(map);
    svg += this.renderSvgMonthLabels(map.startMonth);
    svg += this.renderSvgDayLabels();
    svg += this.renderSvgGrid(map);
    svg += this.renderSvgLegend(totalHeight);

    svg += "</svg>";
    return svg;
  }

  /**
   * Renders the SVG background rectangle.
   */
  private renderSvgBackground(): string {
    return `<rect width="100%" height="100%" fill="white"/>`;
  }

  /**
   * Renders the SVG header with title and statistics.
   */
  private renderSvgHeader(map: ContributionMap): string {
    let header = `<text x="10" y="20" font-family="Arial, sans-serif" font-size="14" font-weight="bold">Claude Contributions ${map.dateRange}</text>`;
    header += `<text x="10" y="35" font-family="Arial, sans-serif" font-size="10" fill="#666">Total: ${formatTokenCount(
      map.totalTokens
    )} tokens | Max daily: ${formatTokenCount(map.maxDailyTokens)}</text>`;
    return header;
  }

  /**
   * Renders month labels for the SVG display.
   */
  private renderSvgMonthLabels(startMonth: number): string {
    const monthLabels = this.generateMonthLabelsForSvg(startMonth);
    let labels = "";
    
    monthLabels.forEach((month, index) => {
      const x = SVG_CONFIG.DAY_LABEL_WIDTH + index * 4.5 * (SVG_CONFIG.CELL_SIZE + SVG_CONFIG.CELL_GAP);
      labels += `<text x="${x}" y="${
        SVG_CONFIG.MONTH_LABEL_HEIGHT + 40
      }" font-family="Arial, sans-serif" font-size="9" fill="#666">${month}</text>`;
    });
    
    return labels;
  }

  /**
   * Renders day labels (Mon, Wed, Fri) for the SVG display.
   */
  private renderSvgDayLabels(): string {
    const fullDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let labels = "";
    
    fullDayLabels.forEach((day, index) => {
      if (index % 2 === 1) {
        // Only show Mon, Wed, Fri
        const y = SVG_CONFIG.MONTH_LABEL_HEIGHT + 50 + index * (SVG_CONFIG.CELL_SIZE + SVG_CONFIG.CELL_GAP) + SVG_CONFIG.CELL_SIZE;
        labels += `<text x="10" y="${y}" font-family="Arial, sans-serif" font-size="9" fill="#666">${day}</text>`;
      }
    });
    
    return labels;
  }

  /**
   * Renders the main contribution grid with colored squares for the SVG display.
   */
  private renderSvgGrid(map: ContributionMap): string {
    let grid = "";
    
    map.weeks.forEach((week, weekIndex) => {
      week.days.forEach((day, dayIndex) => {
        const x = SVG_CONFIG.DAY_LABEL_WIDTH + weekIndex * (SVG_CONFIG.CELL_SIZE + SVG_CONFIG.CELL_GAP);
        const y = SVG_CONFIG.MONTH_LABEL_HEIGHT + 50 + dayIndex * (SVG_CONFIG.CELL_SIZE + SVG_CONFIG.CELL_GAP);
        const color = getSvgColor(day.level);

        grid += `<rect x="${x}" y="${y}" width="${SVG_CONFIG.CELL_SIZE}" height="${SVG_CONFIG.CELL_SIZE}" rx="${SVG_CONFIG.CELL_RADIUS}" ry="${SVG_CONFIG.CELL_RADIUS}" fill="${color}" stroke="#1b1f23" stroke-width="0.5">`;
        grid += `<title>${day.date}: ${formatTokenCount(day.tokens)} tokens</title>`;
        grid += `</rect>`;
      });
    });
    
    return grid;
  }

  /**
   * Renders the intensity legend for the SVG display.
   */
  private renderSvgLegend(totalHeight: number): string {
    const legendY = totalHeight - SVG_CONFIG.LEGEND_OFFSET;
    let legend = `<text x="10" y="${legendY}" font-family="Arial, sans-serif" font-size="9" fill="#666">Less</text>`;

    for (let level = 0; level <= 4; level++) {
      const x = SVG_CONFIG.LEGEND_SPACING + level * (SVG_CONFIG.CELL_SIZE + SVG_CONFIG.CELL_GAP);
      legend += `<rect x="${x}" y="${
        legendY - 10
      }" width="${SVG_CONFIG.CELL_SIZE}" height="${SVG_CONFIG.CELL_SIZE}" rx="${SVG_CONFIG.CELL_RADIUS}" ry="${SVG_CONFIG.CELL_RADIUS}" fill="${getSvgColor(
        level
      )}" stroke="#1b1f23" stroke-width="0.5"/>`;
    }

    legend += `<text x="${
      SVG_CONFIG.LEGEND_SPACING + 5 * (SVG_CONFIG.CELL_SIZE + SVG_CONFIG.CELL_GAP)
    }" y="${legendY}" font-family="Arial, sans-serif" font-size="9" fill="#666">More</text>`;

    return legend;
  }

  /**
   * Generates month labels for terminal display with proper spacing.
   * Creates a string with month abbreviations positioned to align with
   * the weeks in the contribution grid.
   */
  private generateMonthLabels(startMonth: number = 1): string {
    const monthSpacing = 4; // Approximate weeks per month

    let label = "";
    for (let i = 0; i < 12; i++) {
      const monthIndex = (startMonth - 1 + i) % 12;
      const position = i * monthSpacing * 2; // 2 chars per week
      label = label.padEnd(position, " ") + MONTH_ABBREVIATIONS[monthIndex];
    }

    return label.substring(0, 106); // Truncate to fit 53 weeks
  }

  /**
   * Generates an ordered array of month abbreviations for SVG rendering.
   * Returns months in the correct order based on the specified start month.
   */
  private generateMonthLabelsForSvg(startMonth: number = 1): string[] {
    const orderedMonths: string[] = [];

    for (let i = 0; i < 12; i++) {
      const monthIndex = (startMonth - 1 + i) % 12;
      orderedMonths.push(MONTH_ABBREVIATIONS[monthIndex]);
    }

    return orderedMonths;
  }

  /**
   * Generates the intensity legend for terminal display.
   * Shows the progression from "Less" to "More" activity using colored squares.
   */
  private generateLegend(): string {
    const legend: string[] = [];
    legend.push(chalk.gray("Less "));

    for (let level = 0; level <= 4; level++) {
      const color = getTerminalColor(level);
      legend.push(color("■"));
    }

    legend.push(chalk.gray(" More"));
    return legend.join(" ");
  }
}
