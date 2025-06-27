import { z } from 'zod';

// Branded types for type safety
export type ModelName = string & { readonly __brand: 'ModelName' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type RequestId = string & { readonly __brand: 'RequestId' };
export type MessageId = string & { readonly __brand: 'MessageId' };
export type ISOTimestamp = string & { readonly __brand: 'ISOTimestamp' };

// Helper functions to create branded types
export const createModelName = (value: string): ModelName => value as ModelName;
export const createSessionId = (value: string): SessionId => value as SessionId;
export const createRequestId = (value: string): RequestId => value as RequestId;
export const createMessageId = (value: string): MessageId => value as MessageId;
export const createISOTimestamp = (value: string): ISOTimestamp => value as ISOTimestamp;

// Usage entry schema (based on Claude Code JSONL format)
export const usageEntrySchema = z.object({
  timestamp: z.string().transform(createISOTimestamp),
  type: z.string().optional(),
  message: z.object({
    id: z.string().optional().transform(val => val ? createMessageId(val) : undefined),
    model: z.string().optional().transform(val => val ? createModelName(val) : undefined),
    usage: z.object({
      input_tokens: z.number(),
      output_tokens: z.number(),
      cache_creation_input_tokens: z.number().optional(),
      cache_read_input_tokens: z.number().optional(),
      service_tier: z.string().optional(),
    }).optional(),
  }).optional(),
  requestId: z.string().optional().transform(val => val ? createRequestId(val) : undefined),
  sessionId: z.string().optional().transform(val => val ? createSessionId(val) : undefined),
  costUSD: z.number().optional(),
  version: z.string().optional(),
}).refine(
  (data) => {
    // Only process assistant messages with usage data
    return data.type === 'assistant' && data.message?.usage;
  },
  { message: "Only assistant messages with usage data are valid" }
);

export type UsageEntry = z.infer<typeof usageEntrySchema>;

// Daily aggregation
export interface DailyUsage {
  date: string; // YYYY-MM-DD format
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  entryCount: number;
}

// Contribution map data
export interface ContributionDay {
  date: string; // YYYY-MM-DD
  tokens: number;
  level: number; // 0-4 intensity level
}

export interface ContributionWeek {
  days: ContributionDay[];
}

export interface ContributionMap {
  year: number;
  weeks: ContributionWeek[];
  totalTokens: number;
  maxDailyTokens: number;
}

// CLI options
export interface ShowOptions {
  year?: number;
  format?: 'terminal' | 'svg';
  dataDir?: string;
}

export interface StatsOptions {
  from?: string;
  to?: string;
  dataDir?: string;
}