# Timeline 朋友圈 API

## 设计目标
- 高并发读：以 `inbox + cursor` 为主，单用户按索引顺序读取。
- 可控写扩散：根据受众规模自动切换 `push / hybrid` 分发。
- 一致性：删帖时同步回收 feed 与点赞关系，避免脏数据。
- 可演进：`distribution_mode` 预留 `pull` 与 `hybrid`，支持大 V 场景扩展。

## 核心架构
- `push`：发帖时 fanout 到受众 inbox，读性能最高。
- `hybrid`：大受众帖子仅 fanout 到种子人群，剩余用户在读 feed 时按权限拉取。
- `pull`：预留模式，默认不主动使用，可用于全量拉模式或灰度实验。

读路径统一输出同一排序键：
- `sort_score = published_at(ms)`
- 二级排序 `post_id`
- 排序规则：`ORDER BY sort_score DESC, post_id DESC`

## 数据结构与数据库表

### 1) `chat_timeline_posts`
帖子主表（内容、可见性、分发模式、计数器）

关键字段：
- `author_id` 作者
- `visibility` 可见范围：`public/friends/private/custom`
- `distribution_mode` 分发模式：`push/pull/hybrid`
- `custom_audience_ids` 自定义可见用户
- `like_count/comment_count/share_count` 计数器
- `status`：`active/deleted`

关键索引：
- `idx_timeline_posts_author_time`
- `idx_timeline_posts_visibility_time`
- `idx_timeline_posts_status_time`
- `idx_timeline_posts_distribution_time`

### 2) `chat_timeline_feed_items`
收件箱表（每个用户可见帖子索引）

关键字段：
- `user_id`
- `post_id`
- `sort_score`
- `status`：`active/removed`

关键索引：
- `idx_timeline_feed_user_score(user_id, sort_score DESC, post_id DESC)`
- `idx_timeline_feed_post(post_id)`

### 3) `chat_timeline_post_likes`
点赞关系表（用户对帖子唯一）

关键字段：
- `post_id + user_id` 唯一约束
- `is_deleted` 软删除（取消点赞）
- `canceled_at`

说明：
- 再次点赞会恢复软删除记录，不会重复插入，避免唯一键冲突。
- 高并发点赞在事务内使用 PostgreSQL advisory lock（`post_id + user_id`）串行化，避免并发竞态导致计数漂移。

## 接口定义

鉴权：所有接口均需 JWT。

- `POST /im/api/v1/timeline/posts`
  - 创建帖子，服务端自动选择 `distribution_mode`。

- `GET /im/api/v1/timeline/feed?cursor=&limit=20`
  - 获取当前用户 feed。
  - 自动合并 `inbox` 与 `hybrid/pull` 拉取候选，按统一游标输出。

- `GET /im/api/v1/timeline/posts/:postId`
  - 获取帖子详情（含权限校验）。

- `GET /im/api/v1/timeline/users/:userId/posts?cursor=&limit=20`
  - 获取用户主页帖子流（按 viewer 权限过滤）。

- `DELETE /im/api/v1/timeline/posts/:postId`
  - 删除本人帖子（帖子软删 + feed 回收 + 点赞软删）。

- `POST /im/api/v1/timeline/posts/:postId/likes`
  - 点赞/取消点赞（支持显式 `liked` 或 toggle）。

## Cursor 规范
- Base64URL JSON:
  - `{"sortScore":"1735700000000","postId":"192000000000000001"}`
- 翻页条件：
  - `(sort_score < cursor.sortScore) OR (sort_score = cursor.sortScore AND post_id < cursor.postId)`

## 性能参数建议
- `TIMELINE_FANOUT_BATCH_SIZE`：默认 `500`
- `TIMELINE_FANOUT_THRESHOLD`：默认 `5000`
- `TIMELINE_HYBRID_SEED_COUNT`：默认 `2000`
- `TIMELINE_FEED_SCAN_ROUNDS`：默认 `4`（用于过滤后回填扫描轮次，降低“首屏被不可见数据淹没”概率）
- `TIMELINE_FEED_PROFILING_ENABLED`：默认 `false`（开启 feed 读路径 profiling 日志）
- `TIMELINE_FEED_PROFILING_SAMPLE_RATE`：默认 `1`（`0~1`，用于控制 profiling 日志采样率）

调优建议：
- 帖子读取压力大：优先提升 `feed_user_score` 命中率和缓存命中率。
- 发帖峰值高：下调 fanout batch，降低单事务写放大。
- 大 V 场景：下调 threshold，尽早进入 `hybrid`。

## 压测脚本
- 脚本：`scripts/timeline-benchmark.js`
- 命令：`npm run bench:timeline`

环境变量：
- `TIMELINE_BENCH_TOKEN`：压测账号 JWT（必填）
- `TIMELINE_BENCH_BASE_URL`：默认 `http://localhost:3000/im/api/v1`
- `TIMELINE_BENCH_POSTS`：发帖请求数，默认 `200`
- `TIMELINE_BENCH_CONCURRENCY`：并发数，默认 `20`
- `TIMELINE_BENCH_FEED_READS`：feed 读取请求数，默认 `300`
- `TIMELINE_BENCH_FEED_LIMIT`：feed 每页条数，默认 `20`
