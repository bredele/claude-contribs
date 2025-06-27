# Claude Contributions

A CLI tool that generates GitHub-style contribution maps for your Claude AI usage, inspired by [ccusage](https://github.com/ryoppippi/ccusage).

## Features

- 📊 **Visual Contribution Maps**: GitHub-style contribution grids showing your Claude usage patterns
- 📈 **Usage Statistics**: Detailed breakdowns of token consumption, costs, and model usage
- 🎨 **Multiple Formats**: Terminal display with colors or SVG export
- 📅 **Flexible Date Ranges**: View specific years or date ranges
- 🔍 **Automatic Data Discovery**: Reads Claude Code JSONL files automatically

## Installation

```bash
npm install -g claude-contributions
```

## Usage

### Show Contribution Map

```bash
# Show current year contribution map
claude-contributions show

# Show specific year
claude-contributions show --year 2024

# Export as SVG
claude-contributions show --format svg

# Use custom data directory
claude-contributions show --data-dir /path/to/claude/data
```

### View Statistics

```bash
# Show all-time statistics
claude-contributions stats

# Show statistics for date range
claude-contributions stats --from 2024-01-01 --to 2024-12-31
```

## Data Source

This tool reads Claude Code JSONL files from:
- Default: `~/.local/share/claude-code/`
- Custom: Use `--data-dir` option

The tool expects JSONL files with usage data in the format:
```json
{
  "timestamp": "2024-06-27T10:30:00Z",
  "message": {
    "id": "msg_123",
    "model": "claude-3-5-sonnet-20241022",
    "usage": {
      "input_tokens": 100,
      "output_tokens": 50
    }
  },
  "requestId": "req_456",
  "costUSD": 0.001
}
```

## Commands

- `claude-contributions show` - Display contribution map (default command)
- `claude-contributions stats` - Show usage statistics

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev

# Lint
npm run lint

# Format
npm run format

# Test
npm run test
```

## License

MIT