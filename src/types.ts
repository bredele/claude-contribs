import { z } from "zod";

// Branded types for type safety
export type ModelName = string & { readonly __brand: "ModelName" };
export type SessionId = string & { readonly __brand: "SessionId" };
export type RequestId = string & { readonly __brand: "RequestId" };
export type MessageId = string & { readonly __brand: "MessageId" };
export type ISOTimestamp = string & { readonly __brand: "ISOTimestamp" };

// Helper functions to create branded types
export const createModelName = (value: string): ModelName => value as ModelName;
export const createSessionId = (value: string): SessionId => value as SessionId;
export const createRequestId = (value: string): RequestId => value as RequestId;
export const createMessageId = (value: string): MessageId => value as MessageId;
export const createISOTimestamp = (value: string): ISOTimestamp =>
  value as ISOTimestamp;

// Usage entry schema (based on Claude Code JSONL format)
export const usageEntrySchema = z
  .object({
    timestamp: z.string().transform(createISOTimestamp),
    type: z.string().optional(),
    message: z
      .object({
        id: z
          .string()
          .optional()
          .transform((val) => (val ? createMessageId(val) : undefined)),
        model: z
          .string()
          .optional()
          .transform((val) => (val ? createModelName(val) : undefined)),
        usage: z
          .object({
            input_tokens: z.number(),
            output_tokens: z.number(),
            cache_creation_input_tokens: z.number().optional(),
            cache_read_input_tokens: z.number().optional(),
            service_tier: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    requestId: z
      .string()
      .optional()
      .transform((val) => (val ? createRequestId(val) : undefined)),
    sessionId: z
      .string()
      .optional()
      .transform((val) => (val ? createSessionId(val) : undefined)),
    costUSD: z.number().optional(),
    version: z.string().optional(),
  })
  .refine(
    (data) => {
      // Process all entries with valid usage data structure
      return data.message?.usage && 
             (data.message.usage.input_tokens >= 0 || data.message.usage.output_tokens >= 0);
    },
    { message: "Only entries with valid usage data structure are processed" }
  );

export type UsageEntry = z.infer<typeof usageEntrySchema>;

// Daily aggregation
export interface DailyUsage {
  date: string; // YYYY-MM-DD format
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
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
  startMonth: number; // 1-12
  endMonth: number; // 1-12
  dateRange: string; // e.g., "July 2024 - July 2025"
  weeks: ContributionWeek[];
  totalTokens: number;
  maxDailyTokens: number;
}

// CLI options
export interface ShowOptions {
  year?: number;
  format?: "terminal" | "svg";
  dataDir?: string;
  startMonth?: number; // 1-12, defaults to 1 (January)
}

export interface StatsOptions {
  from?: string;
  to?: string;
  dataDir?: string;
  json?: boolean;
  debug?: boolean;
  excludeCache?: boolean; // ccusage compatibility mode
}
