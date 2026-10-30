import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const JOBS = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-digest-'));
  fs.copyFileSync('runs/2026-10-28.jsonl', path.join(dir, '2026-10-28.jsonl'));
  fs.writeFileSync(path.join(dir, '2026-10-01.jsonl'), '');
  fs.writeFileSync(
    path.join(dir, '2026-10-02.jsonl'),
    [
      '{"at":"2026-10-02T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
      '{"at":"2026-10-02T02:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
      'not json',
    ].join('\n') + '\n',
  );
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: dir,
  });
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('digest page', () => {
  it('renders every job and the dash for a null owner', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of JOBS) expect(html).toContain(job);
    expect(html).toContain('—');
  });

  it('404s for a night with no file', async () => {
    expect((await app.request('/digest/2099-01-01')).status).toBe(404);
  });

  it('says nothing ran for an empty file', async () => {
    const res = await app.request('/digest/2026-10-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('survives a bad line', async () => {
    expect((await app.request('/digest/2026-10-02')).status).toBe(200);
  });
});

describe('digest json', () => {
  it('returns night, rows and badLines', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.night).toBe('2026-10-28');
    expect(body.rows).toHaveLength(5);
    expect(body.badLines).toBe(1);
    const jobs = body.rows.map((r) => r.job);
    expect(jobs).toEqual([...jobs].sort());
    expect([...jobs].sort()).toEqual(JOBS);
  });

  it('lists the same jobs in the same order as the page', async () => {
    const body = (await (await app.request('/api/digest/2026-10-28')).json()) as Night;
    const html = await (await app.request('/digest/2026-10-28')).text();
    const positions = body.rows.map((r) => html.indexOf(r.job));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('404s for a night with no file', async () => {
    expect((await app.request('/api/digest/2099-01-01')).status).toBe(404);
  });

  it('gives no rows for an empty file', async () => {
    const res = await app.request('/api/digest/2026-10-01');
    expect(res.status).toBe(200);
    expect(((await res.json()) as Night).rows).toEqual([]);
  });

  it('counts a bad line without dropping the good ones', async () => {
    const res = await app.request('/api/digest/2026-10-02');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(1);
  });
});
