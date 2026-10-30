import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('readNight', () => {
  const tmpDirs: string[] = [];
  const tempRunsDir = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
    tmpDirs.push(dir);
    return dir;
  };

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('reads runs/2026-10-28.jsonl into 5 jobs and 1 bad line', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night).not.toBeNull();
    if (night === null) return;
    expect(night.night).toBe('2026-10-28');
    expect(night.badLines).toBe(1);
    expect(night.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);

    const byJob = new Map(night.rows.map((r) => [r.job, r]));
    expect(byJob.get('digest/render')).toEqual({
      job: 'digest/render',
      owner: null,
      runs: 1,
      retries: 0,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T05:41:09+01:00',
      lastAt: '2026-10-29T05:41:09+01:00',
    });
    expect(byJob.get('fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(byJob.get('notes/backup')).toMatchObject({
      runs: 1,
      lastStatus: 'fail',
      lastError: 'quota exceeded',
    });
    expect(byJob.get('lane/sync')).toMatchObject({
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
    expect(readNight(tempRunsDir(), '2026-10-28')).toBeNull();
  });

  it('reads an empty file as no rows and no bad lines', () => {
    const dir = tempRunsDir();
    writeFileSync(join(dir, '2026-10-30.jsonl'), '');
    expect(readNight(dir, '2026-10-30')).toEqual({ night: '2026-10-30', rows: [], badLines: 0 });
  });

  it('skips blank lines and counts shape mismatches as bad', () => {
    const dir = tempRunsDir();
    const lines = [
      '',
      '{"at":"2026-10-30T01:00:00+01:00","job":"a","status":"ok","owner":"x"}',
      '   ',
      '{"at":"2026-10-30T02:00:00+01:00","job":"a","status":"done","owner":"x"}',
      '{"at":"2026-10-30T03:00:00+01:00","job":"a","status":"ok"}',
      '{"at":"2026-10-30T04:00:00+01:00","job":"a","status":"ok","owner":"x","error":5}',
      '[1,2]',
      '',
    ];
    writeFileSync(join(dir, '2026-10-30.jsonl'), lines.join('\n'));
    const night = readNight(dir, '2026-10-30');
    expect(night?.badLines).toBe(4);
    expect(night?.rows).toHaveLength(1);
    expect(night?.rows[0]).toMatchObject({ job: 'a', runs: 1 });
  });
});
