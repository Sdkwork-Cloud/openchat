# Timeline API

## Design Goals
- High-concurrency reads: `inbox + cursor` as the main read path with index-ordered pagination.
- Controlled write amplification: auto-switch distribution mode by audience size (`push` / `hybrid`).
- Consistency: deleting a post reclaims feed items and like relations in one transaction.
- Evolvability: `distribution_mode` keeps `pull` and `hybrid` for large-account expansion.

## Core Architecture
- `push`: fanout to audience inbox at publish time, best read latency.
- `hybrid`: fanout only to seed audience for large reach, remaining users pull on feed read.
- `pull`: reserved mode for experiments or fully pull-based scenarios.

Unified feed sort key:
- `sort_score = published_at(ms)`
- Secondary key: `post_id`
- Order: `ORDER BY sort_score DESC, post_id DESC`

## Data Structures and Tables

### 1) `chat_timeline_posts`
Post main table (content, visibility, distribution mode, counters)

Key fields:
- `author_id`
- `visibility`: `public/friends/private/custom`
- `distribution_mode`: `push/pull/hybrid`
- `custom_audience_ids`
- `like_count/comment_count/share_count`
- `status`: `active/deleted`

Key indexes:
- `idx_timeline_posts_author_time`
- `idx_timeline_posts_visibility_time`
- `idx_timeline_posts_status_time`
- `idx_timeline_posts_distribution_time`

### 2) `chat_timeline_feed_items`
Inbox table (per-user readable post index)

Key fields:
- `user_id`
- `post_id`
- `sort_score`
- `status`: `active/removed`

Key indexes:
- `idx_timeline_feed_user_score(user_id, sort_score DESC, post_id DESC)`
- `idx_timeline_feed_post(post_id)`

### 3) `chat_timeline_post_likes`
Like relation table (unique by user + post)

Key fields:
- Unique key: `post_id + user_id`
- `is_deleted` soft delete on unlike
- `canceled_at`

Notes:
- Re-like restores a soft-deleted row instead of inserting a new row.
- High-concurrency like writes use PostgreSQL advisory lock (`post_id + user_id`) to avoid count drift.

## API Endpoints

Auth: all endpoints require JWT.

- `POST /im/api/v1/timeline/posts`
  - Create post, server decides `distribution_mode`.

- `GET /im/api/v1/timeline/feed?cursor=&limit=20`
  - Get current user's feed.
  - Merges `inbox` and `hybrid/pull` candidates with a unified cursor.

- `GET /im/api/v1/timeline/posts/:postId`
  - Get post detail with permission checks.

- `GET /im/api/v1/timeline/users/:userId/posts?cursor=&limit=20`
  - Get a user's post stream with viewer-based visibility filtering.

- `DELETE /im/api/v1/timeline/posts/:postId`
  - Delete own post (soft delete post + feed reclaim + like soft delete).

- `POST /im/api/v1/timeline/posts/:postId/likes`
  - Like/unlike (supports explicit `liked` or toggle).

## Cursor Format
- Base64URL JSON (legacy Base64 compatible):
  - `{"sortScore":"1735700000000","postId":"192000000000000001"}`
- Pagination predicate:
  - `(sort_score < cursor.sortScore) OR (sort_score = cursor.sortScore AND post_id < cursor.postId)`

## Performance Tuning
- `TIMELINE_FANOUT_BATCH_SIZE`: default `500`
- `TIMELINE_FANOUT_THRESHOLD`: default `5000`
- `TIMELINE_HYBRID_SEED_COUNT`: default `2000`
- `TIMELINE_FEED_SCAN_ROUNDS`: default `4` (extra scan rounds to backfill after visibility filtering)
- `TIMELINE_FEED_PROFILING_ENABLED`: default `false` (enable feed read profiling logs)
- `TIMELINE_FEED_PROFILING_SAMPLE_RATE`: default `1` (`0~1`, controls profiling log sampling rate)

Tuning notes:
- High feed read pressure: prioritize `feed_user_score` index hit ratio and caching.
- High post write bursts: lower fanout batch size to reduce single-transaction write spikes.
- Large-author scenarios: lower threshold to enter `hybrid` earlier.

## Benchmark Script
- Script: `scripts/timeline-benchmark.js`
- Command: `npm run bench:timeline`

Environment variables:
- `TIMELINE_BENCH_TOKEN`: benchmark account JWT (required)
- `TIMELINE_BENCH_BASE_URL`: default `http://localhost:3000/im/api/v1`
- `TIMELINE_BENCH_POSTS`: post request count, default `200`
- `TIMELINE_BENCH_CONCURRENCY`: concurrency, default `20`
- `TIMELINE_BENCH_FEED_READS`: feed read request count, default `300`
- `TIMELINE_BENCH_FEED_LIMIT`: feed page size, default `20`
