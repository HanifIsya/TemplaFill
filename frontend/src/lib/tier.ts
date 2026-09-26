import { Tier } from './types';

/** Contact address shown on the request-an-account screen (TIER_PLAN §3). */
export const ACCOUNT_REQUEST_EMAIL = 'hanif.isya.annafi-2024@fst.unair.ac.id';

/** Free tier cap enforced server-side (5 jobs/day/IP). */
export const FREE_DAILY_LIMIT = 5;

export const TIER_BADGE: Record<Tier, { label: string; short: string }> = {
  free: { label: 'Free · Gemini', short: 'Free' },
  pro: { label: 'Account · DeepSeek', short: 'Account' },
};

export function remainingFreeJobs(quota: { free_used_today: number; free_limit: number }): number {
  return Math.max(0, quota.free_limit - quota.free_used_today);
}

export function quotaExhausted(quota: { free_used_today: number; free_limit: number }): boolean {
  return quota.free_used_today >= quota.free_limit;
}
