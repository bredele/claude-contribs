import chalk from 'chalk';
import type { DailyUsage, ContributionMap, ContributionWeek, ContributionDay } from './types.js';
import { getWeeksInYear, getWeeksInCustomYear, getDaysInWeek, formatDate, getMonthName } from './utils/date-utils.js';
import { getContributionLevel, getTerminalColor, getSvgColor, formatTokenCount } from './utils/color-utils.js';

export class ContributionVisualizer {
  generateContributionMap(dailyUsage: DailyUsage[], year: number, startMonth: number = 1): ContributionMap {
    const weeks = startMonth === 1 ? getWeeksInYear(year) : getWeeksInCustomYear(year, startMonth);
    const usageMap = new Map(dailyUsage.map(usage => [usage.date, usage]));
    
    let totalTokens = 0;
    let maxDailyTokens = 0;
    
    // First pass: calculate max tokens for level calculation
    for (const usage of dailyUsage) {
      totalTokens += usage.totalTokens;
      maxDailyTokens = Math.max(maxDailyTokens, usage.totalTokens);
    }
    
    const contributionWeeks: ContributionWeek[] = weeks.map(weekStart => {
      const days = getDaysInWeek(weekStart);
      const contributionDays: ContributionDay[] = days.map(day => {
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
    
    // Calculate end month and date range
    const endMonth = startMonth === 1 ? 12 : startMonth - 1;
    const endYear = startMonth === 1 ? year : year + 1;
    
    let dateRange: string;
    if (startMonth === 1) {
      dateRange = `${year}`;
    } else {
      dateRange = `${getMonthName(startMonth)} ${year} - ${getMonthName(endMonth)} ${endYear}`;
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

  renderTerminal(map: ContributionMap): string {
    const output: string[] = [];
    
    // Header with date range and stats
    output.push('');
    output.push(chalk.bold(`Claude Contributions ${map.dateRange}`));
    output.push(chalk.gray(`Total tokens: ${formatTokenCount(map.totalTokens)} | Max daily: ${formatTokenCount(map.maxDailyTokens)}`));
    output.push('');
    
    // Month labels
    const monthLabels = this.generateMonthLabels(map.startMonth);
    output.push(`     ${monthLabels}`);
    
    // Day labels and contribution grid
    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const label = dayLabels[dayIndex].padEnd(3, ' ');
      const row: string[] = [label];
      
      for (const week of map.weeks) {
        const day = week.days[dayIndex];
        const color = getTerminalColor(day.level);
        row.push(color('■'));
      }
      
      output.push(row.join(' '));
    }
    
    // Legend
    output.push('');
    output.push(this.generateLegend());
    output.push('');
    
    return output.join('\n');
  }

  renderSvg(map: ContributionMap): string {
    const cellSize = 11;
    const cellGap = 1; // Reduced from 2 for tighter spacing
    const cellRadius = 2; // Rounded corners
    const monthLabelHeight = 15;
    const dayLabelWidth = 25;
    
    const gridWidth = map.weeks.length * (cellSize + cellGap);
    const gridHeight = 7 * (cellSize + cellGap);
    const totalWidth = dayLabelWidth + gridWidth + 20;
    const totalHeight = monthLabelHeight + gridHeight + 40;
    
    let svg = `<svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Background
    svg += `<rect width="100%" height="100%" fill="white"/>`;
    
    // Title
    svg += `<text x="10" y="20" font-family="Arial, sans-serif" font-size="14" font-weight="bold">Claude Contributions ${map.dateRange}</text>`;
    
    // Stats
    svg += `<text x="10" y="35" font-family="Arial, sans-serif" font-size="10" fill="#666">Total: ${formatTokenCount(map.totalTokens)} tokens | Max daily: ${formatTokenCount(map.maxDailyTokens)}</text>`;
    
    // Month labels
    const monthLabels = this.generateMonthLabelsForSvg(map.startMonth);
    monthLabels.forEach((month, index) => {
      const x = dayLabelWidth + (index * 4.5 * (cellSize + cellGap));
      svg += `<text x="${x}" y="${monthLabelHeight + 40}" font-family="Arial, sans-serif" font-size="9" fill="#666">${month}</text>`;
    });
    
    // Day labels
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayLabels.forEach((day, index) => {
      if (index % 2 === 1) { // Only show Mon, Wed, Fri
        const y = monthLabelHeight + 50 + (index * (cellSize + cellGap)) + cellSize;
        svg += `<text x="10" y="${y}" font-family="Arial, sans-serif" font-size="9" fill="#666">${day}</text>`;
      }
    });
    
    // Contribution grid
    map.weeks.forEach((week, weekIndex) => {
      week.days.forEach((day, dayIndex) => {
        const x = dayLabelWidth + (weekIndex * (cellSize + cellGap));
        const y = monthLabelHeight + 50 + (dayIndex * (cellSize + cellGap));
        const color = getSvgColor(day.level);
        
        svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="${cellRadius}" ry="${cellRadius}" fill="${color}" stroke="#1b1f23" stroke-width="0.5">`;
        svg += `<title>${day.date}: ${formatTokenCount(day.tokens)} tokens</title>`;
        svg += `</rect>`;
      });
    });
    
    // Legend
    const legendY = totalHeight - 25;
    svg += `<text x="10" y="${legendY}" font-family="Arial, sans-serif" font-size="9" fill="#666">Less</text>`;
    
    for (let level = 0; level <= 4; level++) {
      const x = 40 + (level * (cellSize + cellGap));
      svg += `<rect x="${x}" y="${legendY - 10}" width="${cellSize}" height="${cellSize}" rx="${cellRadius}" ry="${cellRadius}" fill="${getSvgColor(level)}" stroke="#1b1f23" stroke-width="0.5"/>`;
    }
    
    svg += `<text x="${40 + (5 * (cellSize + cellGap))}" y="${legendY}" font-family="Arial, sans-serif" font-size="9" fill="#666">More</text>`;
    
    svg += '</svg>';
    return svg;
  }

  private generateMonthLabels(startMonth: number = 1): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthSpacing = 4; // Approximate weeks per month
    
    let label = '';
    for (let i = 0; i < 12; i++) {
      const monthIndex = (startMonth - 1 + i) % 12;
      const position = i * monthSpacing * 2; // 2 chars per week
      label = label.padEnd(position, ' ') + months[monthIndex];
    }
    
    return label.substring(0, 106); // Truncate to fit 53 weeks
  }

  private generateMonthLabelsForSvg(startMonth: number = 1): string[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const orderedMonths: string[] = [];
    
    for (let i = 0; i < 12; i++) {
      const monthIndex = (startMonth - 1 + i) % 12;
      orderedMonths.push(months[monthIndex]);
    }
    
    return orderedMonths;
  }

  private generateLegend(): string {
    const legend: string[] = [];
    legend.push(chalk.gray('Less '));
    
    for (let level = 0; level <= 4; level++) {
      const color = getTerminalColor(level);
      legend.push(color('■'));
    }
    
    legend.push(chalk.gray(' More'));
    return legend.join(' ');
  }
}