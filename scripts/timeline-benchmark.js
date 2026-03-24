#!/usr/bin/env node
/* eslint-disable no-console */

const axios = require('axios');

const BASE_URL = process.env.TIMELINE_BENCH_BASE_URL || 'http://localhost:3000/im/v3';
const TOKEN = process.env.TIMELINE_BENCH_TOKEN || '';
const POSTS = Number(process.env.TIMELINE_BENCH_POSTS || 200);
const CONCURRENCY = Number(process.env.TIMELINE_BENCH_CONCURRENCY || 20);
const FEED_READS = Number(process.env.TIMELINE_BENCH_FEED_READS || 300);
const FEED_LIMIT = Number(process.env.TIMELINE_BENCH_FEED_LIMIT || 20);

if (!TOKEN) {
  console.error('TIMELINE_BENCH_TOKEN is required');
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * q)));
  return sorted[idx];
}

function summarize(name, durations, totalMs) {
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = durations.reduce((acc, cur) => acc + cur, 0);
  const avg = durations.length ? sum / durations.length : 0;
  const p50 = quantile(sorted, 0.5);
  const p95 = quantile(sorted, 0.95);
  const p99 = quantile(sorted, 0.99);
  const rps = totalMs > 0 ? (durations.length * 1000) / totalMs : 0;

  console.log(`\n[${name}]`);
  console.log(`count=${durations.length}`);
  console.log(`avg=${avg.toFixed(2)}ms p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms p99=${p99.toFixed(2)}ms`);
  console.log(`throughput=${rps.toFixed(2)} req/s`);
}

async function runWithConcurrency(total, concurrency, taskFactory) {
  const durations = [];
  let cursor = 0;

  async function worker(workerId) {
    while (true) {
      const index = cursor++;
      if (index >= total) {
        return;
      }
      const start = Date.now();
      await taskFactory(index, workerId);
      durations.push(Date.now() - start);
    }
  }

  const startAll = Date.now();
  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, (_, workerId) => worker(workerId)),
  );
  const totalMs = Date.now() - startAll;

  return { durations, totalMs };
}

async function benchPublish() {
  console.log(`\nPublishing posts: total=${POSTS}, concurrency=${CONCURRENCY}`);
  const payloadBase = {
    visibility: 'friends',
    media: [],
  };

  return runWithConcurrency(POSTS, CONCURRENCY, async (i) => {
    await client.post('/timeline/posts', {
      ...payloadBase,
      text: `timeline benchmark post #${i} @${Date.now()}`,
    });
  });
}

async function benchFeedRead() {
  console.log(`\nReading feed: total=${FEED_READS}, concurrency=${CONCURRENCY}, limit=${FEED_LIMIT}`);
  const workerCursors = new Map();

  return runWithConcurrency(FEED_READS, CONCURRENCY, async (_index, workerId) => {
    const localCursor = workerCursors.get(workerId) || '';
    const params = new URLSearchParams();
    params.set('limit', String(FEED_LIMIT));
    if (localCursor) {
      params.set('cursor', localCursor);
    }

    const resp = await client.get(`/timeline/feed?${params.toString()}`);
    const nextCursor = resp?.data?.nextCursor || '';
    workerCursors.set(workerId, nextCursor);
    if (!nextCursor) {
      await sleep(5);
    }
  });
}

async function main() {
  console.log('Timeline benchmark started');
  console.log(`baseURL=${BASE_URL}`);

  const healthStart = Date.now();
  await client.get('/health');
  console.log(`health check ok (${Date.now() - healthStart}ms)`);

  const publish = await benchPublish();
  summarize('publish', publish.durations, publish.totalMs);

  const feed = await benchFeedRead();
  summarize('feed-read', feed.durations, feed.totalMs);

  console.log('\nBenchmark done');
}

main().catch((err) => {
  console.error('Benchmark failed:', err?.response?.status, err?.response?.data || err.message);
  process.exit(1);
});

