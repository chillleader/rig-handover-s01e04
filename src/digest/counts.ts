import type { Night } from './types.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Counts per job (last status), except retry, which is the total retries across the night.
export function nightCounts(night: Night): NightCounts {
  let ok = 0;
  let retry = 0;
  let fail = 0;
  for (const row of night.rows) {
    retry += row.retries;
    if (row.lastStatus === 'ok') ok += 1;
    else if (row.lastStatus === 'fail') fail += 1;
  }
  return { ok, retry, fail };
}
