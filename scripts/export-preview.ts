import { writeFileSync } from 'node:fs';
import { createApp } from '../src/app.js';

const destination = process.argv[2];
if (!destination) throw new Error('Usage: tsx scripts/export-preview.ts <output.html>');
const response = await createApp().request('/digest/2026-10-28');
if (response.status !== 200) throw new Error(`Digest returned ${response.status}`);
writeFileSync(destination, await response.text(), { mode: 0o600 });
