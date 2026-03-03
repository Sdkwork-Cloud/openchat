# upgrade-多模块服务-v1.1.0-20260303-1730

## 1. 背景
当前 PC 端业务模块已完成 service 边界标准化，但 SDK 对接仍存在能力缺口。为了保证“service 可渐进接入 SDK、业务逻辑可渐进升级”，本文件定义多模块 API 升级需求。

- 升级基线: OpenAPI 3.x
- 目标: 不改 SDK 旧代码，新增/扩展 API 由独立 Agent 实现后再生成 SDK
- 本轮代码策略: 应用层 `apiClient` 已实现 SDK 路由优先与失败自动回退

## 2. 本轮已接入能力（应用侧）
已完成 SDK 路径映射（部分模块为 partial）：
- appstore: categories/apps/detail
- search: global/history/suggestions/hot
- commerce: category/products/hot/latest/detail
- cart: cart/items 主要操作
- notification: list/read/read-all/settings 等核心接口
- settings: theme/privacy/notificationSettings/check-update/models(只读)
- discover: categories/feed/search/hot/banners
- social: moments list/like/comment(delete comment)
- video: list/detail/like/favorite/stats
- wallet: summary/transactions(read)/transfer/payment-methods(read)
- device: register/list

## 3. 缺口与升级需求（必须新增/修正）

### 3.1 social-moments
1. `POST /social/moments` 发布动态
2. `DELETE /social/moments/{momentId}` 删除动态
3. `GET /social/moments/stats` 获取动态统计

### 3.2 video
1. `POST /video/{videoId}/view` 播放量上报
2. `GET /video/{videoId}/comments` 视频评论列表

### 3.3 wallet
1. `GET /wallet/summary` 钱包汇总（余额/冻结/日收入/月支出）
2. `GET /wallet/stats` 钱包统计（收入/支出/分类）
3. `GET /wallet/transactions` 交易分页
4. `POST /wallet/transactions` 新增交易流水
5. `PUT /wallet/payment-methods/default` 设为默认支付方式
6. `POST /wallet/red-packets` 创建红包

### 3.4 device
1. `GET /devices/{deviceId}` 设备详情
2. `PUT /devices/{deviceId}/status` 状态切换
3. `GET /devices/{deviceId}/messages` 设备消息流
4. `POST /devices/{deviceId}/control` 控制命令
5. `GET /devices/stats` 设备统计

### 3.5 settings
1. `GET /settings/storage` 存储统计
2. `POST /settings/storage/clean-cache` 清缓存
3. `POST /settings/storage/clean-all` 清全部数据
4. `POST /settings/models` 保存模型配置
5. `DELETE /settings/models/{modelId}` 删除模型配置
6. `PUT /settings/models/{modelId}/default` 设默认模型

### 3.6 cart / commerce
1. `GET /cart/count` 购物车计数（统一返回）
2. `PUT /cart/select-all` 全选/取消全选（语义标准化）
3. `DELETE /cart/selected` 清空已选
4. `GET /products/{productId}/recommended` 推荐商品

### 3.7 notification
1. `PUT /notification/{notificationId}/unread` 标记未读
2. `GET /notification/stats` 通知统计
3. `POST /notification/clear-read` 清理已读（按类型可选）

### 3.8 skill / tool / agent / memory（SDK空白域）
需要补齐最小可用域 API：
- `skills`: list/detail/enable/disable/config
- `tools`: market/my/test/credential-update
- `agents`: list/detail/session/message
- `agent-memory`: list/search/stats/store/delete

## 4. 接口标准不合理点（需你确认）
1. 当前 SDK 各业务域返回结构不够一致，`data` 内部 shape 漂移较大。
2. 分页结构有 `content/list/items` 多种写法，前端适配成本高。
3. 状态切换接口（read/unread/select-all/default）幂等语义不统一。
4. 通知、钱包、设备等域存在“业务服务需要但 SDK 不可达”的缺口。

### 建议标准（待确认）
1. 响应统一为 `success/code/message/data/requestId/timestamp`。
2. 分页统一为 `content,total,page,size,totalPages`。
3. 所有状态变更接口强制幂等（支持 `Idempotency-Key`）。
4. 所有业务域必须提供 OpenAPI `operationId`，并保持语义稳定。

## 5. 交付产物
- 需求文档: 本文件
- OpenAPI 文档: `upgrade-多模块服务-v1.1.0-20260303-1730-openapi.yaml`
