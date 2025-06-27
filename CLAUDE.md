# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a TypeScript CLI tool that generates GitHub-style contribution maps for Claude AI usage. It reads Claude Code JSONL files and creates visual representations similar to GitHub's contribution graphs.

## Development Commands

### Build and Development
- `npm install` - Install dependencies
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode compilation
- `npm start` - Run the compiled CLI

### Code Quality
- `npm run lint` - Run ESLint on source files
- `npm run format` - Format code with Prettier
- `npm test` - Run tests with Vitest

### CLI Usage
- `node dist/cli.js show` - Display contribution map
- `node dist/cli.js stats` - Show usage statistics

## Architecture

### Core Components
- **DataLoader** (`src/data-loader.ts`): Reads and parses Claude Code JSONL files from `~/.claude/projects/`
- **ContributionVisualizer** (`src/visualizer.ts`): Generates GitHub-style contribution grids with color-coded intensity levels
- **CLI Commands** (`src/commands/`): Command handlers for show and stats operations
- **Type System** (`src/types.ts`): Branded types and Zod schemas for data validation

### Data Flow
1. Load JSONL files containing Claude usage data
2. Parse and validate entries with Zod schemas
3. Deduplicate entries by requestId and messageId
4. Aggregate token usage by day
5. Generate contribution map with 5 intensity levels (0-4)
6. Render as terminal ASCII art or SVG export

### Key Features
- Reads Claude Code JSONL logs automatically
- Supports multiple output formats (terminal, SVG)
- Provides detailed usage statistics
- Handles date range filtering
- Follows ccusage patterns for data loading

## Data Format

The tool expects JSONL files with entries containing:
- `timestamp`: ISO timestamp
- `message.usage.input_tokens`: Number of input tokens
- `message.usage.output_tokens`: Number of output tokens
- `message.model`: Claude model name (optional)
- `costUSD`: Cost in USD (optional)
- `requestId`: For deduplication (optional)