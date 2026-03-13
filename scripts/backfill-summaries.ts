/**
 * Backfill commit summaries for missing dates.
 *
 * Usage: npx tsx scripts/backfill-summaries.ts 2026-03-08 2026-03-09 2026-03-10
 *
 * Reuses the existing adapters to collect commits from GitHub,
 * summarize via Claude, and persist to Supabase.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { loadEnv } from '../src/config/env';
import { GitHubAdapter } from '../src/github/github.adapter';
import { ClaudeAdapter } from '../src/claude/claude.adapter';
import { SupabaseStoreAdapter } from '../src/store/supabase-store.adapter';
import { GitHubDiscoveryAdapter } from '../src/discovery/github-discovery.adapter';
import { CommitInfo } from '../src/github/github.port';
import { logger } from '../src/lib/logger';

const env = loadEnv();
const github = new GitHubAdapter(env.GITHUB_TOKEN);
const claude = new ClaudeAdapter(env.ANTHROPIC_API_KEY, env.CLAUDE_MODEL);
const store = new SupabaseStoreAdapter(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
const discovery = new GitHubDiscoveryAdapter(github, env.GITHUB_ORG);

const agentPrompt = fs.readFileSync(
  path.resolve(process.cwd(), 'agents', 'commit-summarizer.md'),
  'utf-8',
);

async function backfillDate(dateStr: string): Promise<void> {
  // dateStr = "2026-03-08" — collect commits from start of that day to start of next day (UTC)
  const dayStart = new Date(`${dateStr}T00:00:00Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  logger.info('backfill_start', { date: dateStr, since: dayStart.toISOString(), until: dayEnd.toISOString() });

  // Discover repos
  const reposResult = await discovery.discoverRepos();
  if (!reposResult.ok) {
    logger.error('backfill_discovery_failed', new Error(reposResult.error.message), { date: dateStr });
    return;
  }

  // Collect commits for this date range
  const allCommits: CommitInfo[] = [];
  for (const repo of reposResult.data) {
    const commitsResult = await github.listCommitsSince(env.GITHUB_ORG, repo.name, dayStart.toISOString());
    if (commitsResult.ok) {
      // Filter to only commits within the day (before dayEnd)
      const dayCommits = commitsResult.data.filter((c) => new Date(c.date) < dayEnd);
      allCommits.push(...dayCommits);
    }
  }

  logger.info('backfill_commits_collected', { date: dateStr, count: allCommits.length });

  if (allCommits.length === 0) {
    logger.info('backfill_no_commits', { date: dateStr });
    return;
  }

  // Group by repo
  const commitsByRepo = new Map<string, CommitInfo[]>();
  for (const c of allCommits) {
    const existing = commitsByRepo.get(c.repo) ?? [];
    existing.push(c);
    commitsByRepo.set(c.repo, existing);
  }

  const reposActive = [...commitsByRepo.keys()];

  let commitText = '';
  for (const [repo, commits] of commitsByRepo) {
    commitText += `\n## ${repo}\n`;
    for (const c of commits) {
      commitText += `- ${c.sha} ${c.message} (${c.author}, ${c.date})\n`;
    }
  }

  // Claude summary
  const claudeResult = await claude.complete({
    systemPrompt: agentPrompt,
    userMessage: `Here are all commits from ${dateStr} across the richi-solutions organization:\n${commitText}`,
    maxTokens: 4096,
  });

  const summaryContent = claudeResult.ok
    ? claudeResult.data.content
    : `Collected ${allCommits.length} commits but summary generation failed.`;

  const status = claudeResult.ok ? 'success' : 'partial';

  // Save job_run
  const startedAt = dayStart.toISOString();
  const completedAt = dayEnd.toISOString();
  const jobRunResult = await store.saveJobRun({
    jobName: 'daily-commits',
    jobType: 'aggregate',
    startedAt,
    completedAt,
    durationMs: 0,
    status,
    targets: reposResult.data.map((r) => r.name),
    results: [{ target: 'all', status, output: summaryContent }],
    summary: summaryContent.substring(0, 500),
  });

  if (!jobRunResult.ok) {
    logger.error('backfill_store_failed', new Error(jobRunResult.error.message), { date: dateStr });
    return;
  }

  // Save commit_summary
  const summaryResult = await store.saveCommitSummary({
    jobRunId: jobRunResult.data.id,
    summaryDate: dateStr,
    content: summaryContent,
    reposActive,
    totalCommits: allCommits.length,
  });

  if (summaryResult.ok) {
    logger.info('backfill_complete', { date: dateStr, commits: allCommits.length, repos: reposActive.length });
  } else {
    logger.error('backfill_summary_store_failed', new Error(summaryResult.error.message), { date: dateStr });
  }
}

// Main
const dates = process.argv.slice(2);
if (dates.length === 0) {
  console.error('Usage: npx tsx scripts/backfill-summaries.ts 2026-03-08 2026-03-09 2026-03-10');
  process.exit(1);
}

(async () => {
  for (const date of dates) {
    await backfillDate(date);
  }
  logger.info('backfill_all_done', { dates });
  process.exit(0);
})();
