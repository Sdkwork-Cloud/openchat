# OpenChat Server - Project Context

## 椤圭洰姒傝堪

OpenChat 鏄竴涓紑婧愮殑鍗虫椂閫氳骞冲彴鏈嶅姟绔紝鍩轰簬 **NestJS 11.x** 鍜?**TypeScript 5.9+** 鏋勫缓銆傛彁渚涘畬鏁寸殑 IM 鍔熻兘锛屽寘鎷疄鏃舵秷鎭€佺兢缁勭鐞嗐€侀煶瑙嗛閫氳瘽銆丄I 鏈哄櫒浜洪泦鎴愮瓑銆?
### 鏍稿績鎶€鏈爤

| 绫诲埆 | 鎶€鏈?| 鐗堟湰 | 鐢ㄩ€?|
|------|------|------|------|
| 妗嗘灦 | NestJS | 11.x | 搴旂敤鏈嶅姟鍣ㄦ鏋?|
| 璇█ | TypeScript | 5.9+ | 寮€鍙戣瑷€ |
| 鏁版嵁搴?| PostgreSQL | 15+ | 涓绘暟鎹簱 |
| ORM | TypeORM | 0.3.x | 鏁版嵁搴?ORM |
| 缂撳瓨 | Redis | 7+ | 缂撳瓨銆佹秷鎭槦鍒椼€乄ebSocket 閫傞厤鍣?|
| WebSocket | Socket.IO | 4.x | 瀹炴椂閫氫俊 |
| IM 寮曟搸 | WukongIM | v2 | 涓撲笟娑堟伅寮曟搸 |
| 闃熷垪 | BullMQ | 5.x | 寮傛浠诲姟澶勭悊 |
| 璁よ瘉 | JWT + Passport | - | 韬唤璁よ瘉 |

### 涓昏鍔熻兘妯″潡

- **鐢ㄦ埛绯荤粺** - 娉ㄥ唽銆佺櫥褰曘€佷釜浜鸿祫鏂欑鐞?- **濂藉弸绯荤粺** - 濂藉弸娣诲姞銆佸垹闄ゃ€佸垎缁勭鐞?- **缇ょ粍绯荤粺** - 缇ょ粍鍒涘缓銆佹垚鍛樼鐞嗐€佹潈闄愭帶鍒?- **娑堟伅绯荤粺** - 鏂囨湰銆佸浘鐗囥€佽闊炽€佽棰戙€佹枃浠舵秷鎭?- **浼氳瘽绯荤粺** - 浼氳瘽鍒楄〃銆佺疆椤躲€佸厤鎵撴壈
- **鑱旂郴浜虹郴缁?* - 鑱旂郴浜哄垪琛ㄧ鐞?- **RTC** - 瀹炴椂闊宠棰戦€氳瘽
- **AI Bot** - AI 鏈哄櫒浜洪泦鎴?- **绗笁鏂归泦鎴?* - Telegram銆乄hatsApp銆乄ebhook
- **IoT** - ESP32 璁惧鏀寔

## 椤圭洰缁撴瀯

```
openchat-server/
鈹溾攢鈹€ src/                        # 鏈嶅姟绔簮浠ｇ爜
鈹?  鈹溾攢鈹€ common/                 # 鍏叡妯″潡
鈹?  鈹?  鈹溾攢鈹€ auth/               # 璁よ瘉鎺堟潈锛坓uards, strategies, decorators锛?鈹?  鈹?  鈹溾攢鈹€ base/               # 鍩虹被
鈹?  鈹?  鈹溾攢鈹€ cache/              # 缂撳瓨鏈嶅姟
鈹?  鈹?  鈹溾攢鈹€ config/             # 閰嶇疆绠＄悊
鈹?  鈹?  鈹溾攢鈹€ constants/          # 甯搁噺瀹氫箟
鈹?  鈹?  鈹溾攢鈹€ dto/                # 鏁版嵁浼犺緭瀵硅薄
鈹?  鈹?  鈹溾攢鈹€ events/             # 浜嬩欢鎬荤嚎
鈹?  鈹?  鈹溾攢鈹€ exceptions/         # 寮傚父澶勭悊
鈹?  鈹?  鈹溾攢鈹€ filters/            # 杩囨护鍣?鈹?  鈹?  鈹溾攢鈹€ health/             # 鍋ュ悍妫€鏌?鈹?  鈹?  鈹溾攢鈹€ interceptors/       # 鎷︽埅鍣?鈹?  鈹?  鈹溾攢鈹€ logger/             # 鏃ュ織鏈嶅姟
鈹?  鈹?  鈹溾攢鈹€ metrics/            # 鎬ц兘鐩戞帶
鈹?  鈹?  鈹溾攢鈹€ queue/              # 娑堟伅闃熷垪
鈹?  鈹?  鈹溾攢鈹€ redis/              # Redis 鏈嶅姟
鈹?  鈹?  鈹溾攢鈹€ throttler/          # 闄愭祦
鈹?  鈹?  鈹斺攢鈹€ utils/              # 宸ュ叿鍑芥暟
鈹?  鈹溾攢鈹€ gateways/               # WebSocket 缃戝叧
鈹?  鈹溾攢鈹€ modules/                # 涓氬姟妯″潡
鈹?  鈹?  鈹溾攢鈹€ agent/              # 鏅鸿兘浠ｇ悊
鈹?  鈹?  鈹溾攢鈹€ ai-bot/             # AI 鏈哄櫒浜?鈹?  鈹?  鈹溾攢鈹€ bot-platform/       # 鏈哄櫒浜哄钩鍙?鈹?  鈹?  鈹溾攢鈹€ contact/            # 鑱旂郴浜?鈹?  鈹?  鈹溾攢鈹€ conversation/       # 浼氳瘽
鈹?  鈹?  鈹溾攢鈹€ friend/             # 濂藉弸绯荤粺
鈹?  鈹?  鈹溾攢鈹€ group/              # 缇ょ粍绯荤粺
鈹?  鈹?  鈹溾攢鈹€ im-provider/        # IM 鎻愪緵鑰?鈹?  鈹?  鈹溾攢鈹€ iot/                # IoT 璁惧
鈹?  鈹?  鈹溾攢鈹€ message/            # 娑堟伅绯荤粺
鈹?  鈹?  鈹溾攢鈹€ rtc/                # 瀹炴椂闊宠棰?鈹?  鈹?  鈹溾攢鈹€ third-party/        # 绗笁鏂归泦鎴?鈹?  鈹?  鈹溾攢鈹€ user/               # 鐢ㄦ埛绯荤粺
鈹?  鈹?  鈹斺攢鈹€ wukongim/           # WukongIM 闆嗘垚
鈹?  鈹溾攢鈹€ extensions/             # 鎵╁睍妯″潡
鈹?  鈹溾攢鈹€ app.module.ts           # 搴旂敤涓绘ā鍧?鈹?  鈹溾攢鈹€ bootstrap.ts            # 鍚姩寮曞
鈹?  鈹溾攢鈹€ data-source.ts          # 鏁版嵁婧愰厤缃?鈹?  鈹斺攢鈹€ main.ts                 # 鍏ュ彛鏂囦欢
鈹溾攢鈹€ app/                        # 搴旂敤绋嬪簭锛堝墠绔級
鈹溾攢鈹€ sdk/                        # SDK 鐩綍
鈹溾攢鈹€ database/                   # 鏁版嵁搴撹剼鏈?鈹?  鈹溾攢鈹€ schema.sql              # 鏁版嵁搴撶粨鏋?鈹?  鈹溾攢鈹€ seed.sql                # 绉嶅瓙鏁版嵁
鈹?  鈹斺攢鈹€ indexes-optimization.sql # 绱㈠紩浼樺寲
鈹溾攢鈹€ docker-compose*.yml         # Docker 缂栨帓閰嶇疆
鈹溾攢鈹€ scripts/                    # 鑴氭湰宸ュ叿
鈹溾攢鈹€ test/                       # 娴嬭瘯鏂囦欢
鈹斺攢鈹€ docs/                       # 鏂囨。
```

## 鏋勫缓涓庤繍琛?
### 鐜瑕佹眰

| 渚濊禆 | 鐗堟湰 | 璇存槑 |
|------|------|------|
| Node.js | 18+ | 杩愯鐜 |
| pnpm | 8+ | 鍖呯鐞嗗櫒 |
| PostgreSQL | 15+ | 鏁版嵁搴擄紙鍙閮級 |
| Redis | 7+ | 缂撳瓨锛堝彲澶栭儴锛?|
| Docker | 24.0+ | 瀹瑰櫒杩愯锛堟帹鑽愶級 |

### 瀹夎渚濊禆

```bash
pnpm install
```

### 鐜閰嶇疆

```bash
# 澶嶅埗鐜鍙橀噺绀轰緥鏂囦欢
cp .env.example .env

# 缂栬緫 .env 鏂囦欢锛岃嚦灏戦渶瑕佽缃細
# JWT_SECRET=your-jwt-secret-at-least-32-characters-long
```

### 寮€鍙戞ā寮忚繍琛?
```bash
# 鍚姩寮€鍙戞湇鍔″櫒锛堝甫鐑噸杞斤級
pnpm run start:dev

# 鎴栫洿鎺ヤ娇鐢?pnpm run dev
```

### 鐢熶骇妯″紡杩愯

```bash
# 鏋勫缓
pnpm run build

# 鍚姩鐢熶骇鏈嶅姟鍣?pnpm run start:prod
```

### Docker 杩愯锛堟帹鑽愶級

```bash
# 蹇€熷惎鍔紙鍖呭惈鎵€鏈夋湇鍔★級
pnpm run docker:quick

# 鎴栦娇鐢?docker compose
docker compose -f docker-compose.quick.yml up -d

# 鏌ョ湅鏃ュ織
docker compose logs -f

# 鍋滄鏈嶅姟
docker compose -f docker-compose.quick.yml down
```

### 鍋ュ悍妫€鏌?
```bash
# 蹇€熷仴搴锋鏌?pnpm run health

# 瀹屾暣鍋ュ悍妫€鏌?pnpm run health:full
```

### 璁块棶绔偣

| 鏈嶅姟 | URL |
|------|-----|
| API 鏈嶅姟 | http://localhost:3000 |
| Swagger 鏂囨。 | http://localhost:3000/im/v3/docs |
| 鍋ュ悍妫€鏌?| http://localhost:3000/health |
| WukongIM Demo | http://localhost:5172 |
| WukongIM 绠＄悊 | http://localhost:5300/web |

## 娴嬭瘯

```bash
# 鍗曞厓娴嬭瘯
pnpm run test

# 娴嬭瘯瑕嗙洊鐜?pnpm run test:cov

# E2E 娴嬭瘯
pnpm run test:e2e

# 鐩戣妯″紡
pnpm run test:watch
```

## 浠ｇ爜璐ㄩ噺

```bash
# 浠ｇ爜鏍煎紡鍖?pnpm run format

# ESLint 妫€鏌?pnpm run lint

# 绫诲瀷妫€鏌?pnpm run typecheck
```

## 鏁版嵁搴撹縼绉?
```bash
# 鐢熸垚杩佺Щ鏂囦欢
pnpm run migration:generate -- -n MigrationName

# 鎵ц杩佺Щ
pnpm run migration:run

# 鍥炴粴杩佺Щ
pnpm run migration:revert

# 鍒濆鍖栨暟鎹簱
pnpm run db:init

# 鎻掑叆绉嶅瓙鏁版嵁
pnpm run db:seed
```

## 寮€鍙戣鑼?
### 鍛藉悕绾﹀畾

| 椤圭洰 | 绾﹀畾 | 绀轰緥 |
|------|------|------|
| 绫诲悕 | PascalCase | `UserService` |
| 鏂规硶鍚?| camelCase | `getUserById()` |
| 鍙橀噺鍚?| camelCase | `userId` |
| 甯搁噺 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 鏂囦欢/鐩綍鍚?| kebab-case | `user-service.ts` |
| 妯″潡鍚?| PascalCase | `UserModule` |

### 浠ｇ爜椋庢牸

- 浣跨敤 TypeScript 涓ユ牸妯″紡
- 閬靛惊 NestJS 浠ｇ爜椋庢牸鎸囧崡
- 浣跨敤 ESLint + Prettier 淇濊瘉浠ｇ爜璐ㄩ噺
- 渚濊禆娉ㄥ叆浣跨敤鏋勯€犲嚱鏁版敞鍏?- 鏈嶅姟绫讳娇鐢?`@Injectable()` 瑁呴グ鍣?
### 妯″潡缁撴瀯

姣忎釜涓氬姟妯″潡搴斿寘鍚細
- `xxx.module.ts` - 妯″潡瀹氫箟
- `xxx.controller.ts` - HTTP 鎺у埗鍣?- `xxx.service.ts` - 涓氬姟閫昏緫鏈嶅姟
- `xxx.entity.ts` - 鏁版嵁搴撳疄浣?- `dto/` - 鏁版嵁浼犺緭瀵硅薄
- `interfaces/` - 鎺ュ彛瀹氫箟

### 鎻愪氦瑙勮寖

閬靛惊 Conventional Commits锛?- `feat:` 鏂板姛鑳?- `fix:` Bug 淇
- `docs:` 鏂囨。鏇存柊
- `style:` 浠ｇ爜鏍煎紡璋冩暣
- `refactor:` 浠ｇ爜閲嶆瀯
- `test:` 娴嬭瘯鐩稿叧
- `chore:` 鏋勫缓/宸ュ叿閰嶇疆

## 鍏抽敭閰嶇疆椤?
### 蹇呴渶閰嶇疆

```bash
# .env 鏂囦欢涓繀椤昏缃?JWT_SECRET=your-jwt-secret-at-least-32-characters-long
```

### 鏁版嵁搴撻厤缃?
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=openchat
DB_PASSWORD=your-password
DB_NAME=openchat
```

### Redis 閰嶇疆

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### WukongIM 閰嶇疆

```bash
WUKONGIM_API_URL=http://localhost:5001
WUKONGIM_TCP_ADDR=localhost:5100
WUKONGIM_WS_URL=ws://localhost:5200
```

## 璇婃柇宸ュ叿

椤圭洰鎻愪緵浜嗕竴濂楀畬鏁寸殑璇婃柇鍜屼慨澶嶅伐鍏凤細

```bash
# 绯荤粺棰勬鏌?pnpm run precheck

# 杩愯璇婃柇
pnpm run diagnose

# 鑷姩淇甯歌闂
pnpm run auto-fix

# 鍒嗘瀽鏃ュ織
pnpm run log:analyze

# 鍋ュ悍鐩戞帶
pnpm run health:monitor
```

## 甯歌闂

### WukongIM 杩炴帴闂

1. 妫€鏌?WukongIM 鏈嶅姟鏄惁杩愯锛歚docker ps | grep wukongim`
2. 楠岃瘉 `WUKONGIM_API_URL` 閰嶇疆
3. 杩愯锛歚pnpm run diagnose`

### 鏁版嵁搴撹繛鎺ラ棶棰?
1. 纭繚 PostgreSQL 鏈嶅姟杩愯锛歚docker ps | grep postgres`
2. 楠岃瘉 `.env` 涓殑鏁版嵁搴撻厤缃?3. 杩愯锛歚pnpm run auto-fix`

### Redis 杩炴帴闂

1. 妫€鏌?Redis 鏈嶅姟杩愯锛歚docker ps | grep redis`
2. 楠岃瘉 Redis 閰嶇疆
3. 杩愯锛歚pnpm run auto-fix --redis`

## 鐩稿叧鏂囨。

- [README.md](README.md) - 椤圭洰涓绘枃妗ｏ紙鑻辨枃锛?- [README_CN.md](README_CN.md) - 椤圭洰涓绘枃妗ｏ紙涓枃锛?- [ARCHITECT.md](ARCHITECT.md) - 鏋舵瀯鏍囧噯鏂囨。
- [CONTRIBUTING.md](CONTRIBUTING.md) - 璐＄尞鎸囧崡
- [DEPLOYMENT.md](DEPLOYMENT.md) - 閮ㄧ讲鎸囧崡
- [INSTALL_CN.md](INSTALL_CN.md) - 瀹夎鎸囧崡锛堜腑鏂囷級
- [INSTALL_EN.md](INSTALL_EN.md) - 瀹夎鎸囧崡锛堣嫳鏂囷級

## API 璺敱鍓嶇紑

- HTTP API: `/im/v3`
- WebSocket: `/chat-v2`
- Swagger 鏂囨。: `/im/v3/docs`
- 鍋ュ悍妫€鏌? `/health`锛堟棤鍓嶇紑锛?
## 娉ㄦ剰浜嬮」

1. **鐜鍙橀噺**: 鐢熶骇鐜蹇呴』淇敼 `.env` 涓殑榛樿鍊硷紝鐗瑰埆鏄?`JWT_SECRET`
2. **鏁版嵁搴撳悓姝?*: 寮€鍙戠幆澧?`DB_SYNCHRONIZE=true`锛岀敓浜х幆澧冨繀椤昏涓?`false`
3. **CORS**: 鏍规嵁瀹為檯闇€姹傞厤缃?`CORS_ORIGINS`
4. **璧勬簮闄愬埗**: Docker 閮ㄧ讲鏃舵敞鎰忚皟鏁村唴瀛橀檺鍒堕厤缃?5. **鏃ュ織**: 鐢熶骇鐜寤鸿浣跨敤 `LOG_FORMAT=json` 骞跺惎鐢ㄦ枃浠舵棩蹇?
