// Plan morning-digest § 1. The contract every part of § 2 builds against: one row per job for
// one night, read from runs/<night>.jsonl.

export type RunStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  /** `null` in the log is kept; views render it as `—`. */
  owner: string | null;
  /** Lines for this job. */
  runs: number;
  /** Lines for this job with status `retry`. */
  retries: number;
  lastStatus: RunStatus;
  /** `error` of the job's last line, or `null` when that line has none. */
  lastError: string | null;
  /** `at` as written in the log, offset kept (styleguide: never convert to UTC). */
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  /** Sorted by job. Empty for a file with no valid lines. */
  rows: DigestRow[];
  /** Lines that did not parse or did not match the shape. Counted, never thrown. */
  badLines: number;
};

/** `null` when runs/<night>.jsonl does not exist (routes answer 404). */
export type ReadNight = (runsDir: string, night: string) => Night | null;
