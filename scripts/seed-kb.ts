#!/usr/bin/env tsx
/**
 * seed-kb.ts — Seeds the MarketFlow knowledge base with platform-wide content.
 *
 * Usage:
 *   MARKETFLOW_API_URL=https://marketflowai.codevertexitsolutions.com \
 *   MARKETFLOW_API_KEY=<INTERNAL_SERVICE_KEY> \
 *   pnpm tsx scripts/seed-kb.ts [--dry-run] [--file ./public/kb/platform-seed.json]
 */

import fs from 'fs';
import path from 'path';

const API_URL  = process.env.MARKETFLOW_API_URL || 'http://localhost:4001';
const API_KEY  = process.env.MARKETFLOW_API_KEY || '';
const DRY_RUN  = process.argv.includes('--dry-run');
const fileArg  = process.argv.find(a => a.startsWith('--file='))?.split('=')[1]
  || process.argv[process.argv.indexOf('--file') + 1];
const KB_FILE  = fileArg || path.join(process.cwd(), 'public/kb/platform-seed.json');

interface KBEntry {
  scope: string;
  category: string;
  title: string;
  content: string;
  tags?: string[];
}

async function main() {
  if (!API_KEY && !DRY_RUN) {
    console.error('Error: MARKETFLOW_API_KEY is required. Use --dry-run to preview without posting.');
    process.exit(1);
  }

  const raw = fs.readFileSync(KB_FILE, 'utf-8');
  const entries: KBEntry[] = JSON.parse(raw);
  console.log(`Loaded ${entries.length} entries from ${KB_FILE}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would POST the following entries:');
    const byCategory: Record<string, number> = {};
    for (const e of entries) {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    }
    for (const [cat, count] of Object.entries(byCategory)) {
      console.log(`  ${cat}: ${count} entries`);
    }
    console.log('\nTotal:', entries.length, 'entries');
    return;
  }

  let success = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/kb/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(entry),
      });

      if (res.ok) {
        success++;
        console.log(`✓ [${entry.category}] ${entry.title}`);
      } else {
        const body = await res.text();
        // Skip duplicates gracefully
        if (res.status === 409) {
          console.log(`~ [${entry.category}] ${entry.title} (already exists)`);
          success++;
        } else {
          console.error(`✗ [${entry.category}] ${entry.title} — HTTP ${res.status}: ${body.slice(0, 120)}`);
          failed++;
        }
      }
    } catch (err) {
      console.error(`✗ [${entry.category}] ${entry.title} — ${err}`);
      failed++;
    }

    // Small delay to avoid overwhelming the API
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
