<div align="center">

<img src="./docs/assets/images/branding/logo.png" width="150" alt="OpenChat Logo">

# OpenChat

**寮€婧愬嵆鏃堕€氳瑙ｅ喅鏂规 - 鏈嶅姟绔€丼DK銆佸簲鐢ㄤ竴浣撳寲**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E.svg?logo=nestjs)](https://nestjs.com/)
[![Docker](https://img.shields.io/badge/Docker-24.0+-2496ED.svg?logo=docker)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg?logo=redis)](https://redis.io/)
[![WukongIM](https://img.shields.io/badge/WukongIM-v2-orange.svg)](https://githubim.com/)

[English](README.md) | [涓枃](README_CN.md)

</div>

---

## 馃摉 鐩綍

- [馃摉 鐩綍](#-鐩綍)
- [馃殌 蹇€熷紑濮媇(#-蹇€熷紑濮?
  - [鐜瑕佹眰](#鐜瑕佹眰)
  - [瀹夎姝ラ](#瀹夎姝ラ)
  - [Docker 閮ㄧ讲锛堟帹鑽愶級](#docker-閮ㄧ讲鎺ㄨ崘)
- [鉁?鍔熻兘鐗规€(#-鍔熻兘鐗规€?
  - [馃挰 鍗虫椂閫氳](#-鍗虫椂閫氳)
  - [馃攰 瀹炴椂闊宠棰慮(#-瀹炴椂闊宠棰?
  - [馃 AI 鍔╂墜](#-ai-鍔╂墜)
  - [馃攲 绗笁鏂归泦鎴怾(#-绗笁鏂归泦鎴?
  - [馃洜锔?绯荤粺鍔熻兘](#锔?绯荤粺鍔熻兘)
- [馃搧 绯荤粺鏋舵瀯](#-绯荤粺鏋舵瀯)
- [馃敡 鎶€鏈爤](#-鎶€鏈爤)
- [馃摎 API 鏂囨。](#-api-鏂囨。)
- [馃彈锔?椤圭洰缁撴瀯](#锔?椤圭洰缁撴瀯)
- [馃寪 闆嗘垚](#-闆嗘垚)
- [鈿?鎬ц兘浼樺寲](#-鎬ц兘浼樺寲)
- [馃敀 瀹夊叏](#-瀹夊叏)
- [馃搳 鐩戞帶涓庢棩蹇梋(#-鐩戞帶涓庢棩蹇?
- [馃摝 閮ㄧ讲](#-閮ㄧ讲)
- [馃懆鈥嶐煉?寮€鍙戞寚鍗梋(#锔?寮€鍙戞寚鍗?
- [馃И 娴嬭瘯](#-娴嬭瘯)
- [鉂?甯歌闂](#-甯歌闂)
- [馃 璐＄尞鎸囧崡](#-璐＄尞鎸囧崡)
- [馃搫 璁稿彲璇乚(#-璁稿彲璇?
- [馃挰 绀惧尯](#-绀惧尯)
- [馃摲 鎴浘](#-鎴浘)

---

## 馃殌 蹇€熷紑濮?
### 鐜瑕佹眰

| 渚濊禆 | 鐗堟湰瑕佹眰 | 璇存槑 |
|------|---------|------|
| Docker | 24.0+ | 瀹瑰櫒杩愯鏃讹紙鎺ㄨ崘锛?|
| Docker Compose | 2.0+ | 瀹瑰櫒缂栨帓 |
| Node.js | 18+ | 杩愯鐜锛堢嫭绔嬮儴缃诧級 |
| PostgreSQL | 15+ | 涓绘暟鎹簱锛堝閮級 |
| Redis | 7+ | 缂撳瓨鍜屾秷鎭槦鍒楋紙澶栭儴锛?|

### 统一部署（推荐）
**Linux / macOS:**

```bash
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
cp .env.example .env
# 按需编辑 .env
./scripts/deploy-server.sh production --db-action auto --yes --service
```

**Windows:**

```powershell
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
Copy-Item .env.example .env
# 按需编辑 .env
.\scripts\deploy-server.ps1 production -DbAction auto -Yes
```

### 瀹夎鍓嶆鏌?
```bash
# Linux / macOS
./scripts/precheck.sh

# Windows
scripts\precheck.ps1
```

瀹夎鍓嶆鏌ヨ剼鏈皢楠岃瘉锛?- 鎿嶄綔绯荤粺鍜屾灦鏋?- 鍐呭瓨鍜岀鐩樼┖闂?- Docker 鍜?Docker Compose
- 绔彛鍙敤鎬?- 缃戠粶杩炴帴

### Docker 蹇€熷惎鍔?
```bash
# 蹇€熷惎鍔紙涓€鏉″懡浠ゅ惎鍔ㄦ墍鏈夋湇鍔★級
docker compose -f docker-compose.quick.yml up -d

# 鎴栦娇鐢ㄩ儴缃茶剼鏈紙浼氬仛渚濊禆鍜岀鍙ｆ鏌ワ級
./scripts/docker-deploy.sh install

# 鏌ョ湅鏈嶅姟鐘舵€?docker compose ps

# 鏌ョ湅鏃ュ織
docker compose logs -f
```

### 鎵嬪姩瀹夎

```bash
# 鍏嬮殕椤圭洰
git clone <your-openchat-repo-url> openchat-server
cd openchat-server

# 瀹夎渚濊禆
npm install

# 閰嶇疆鐜
cp .env.example .env.development
vim .env.development

# 鍒濆鍖栨暟鎹簱锛堝叏鏂板簱锛?./scripts/init-database.sh development

# 瀛橀噺搴撳崌绾э紙鍙噸澶嶆墽琛岋級
./scripts/apply-db-patches.sh development

# 鎴栧紑鍙戞ā寮忓惎鍔?npm run start:dev
```

### 楠岃瘉瀹夎

```bash
# 鍋ュ悍妫€鏌?curl http://localhost:3000/health

# API 鏂囨。
open http://localhost:3000/im/v3/docs

# 杩愯鍋ュ悍妫€鏌ヨ剼鏈?./scripts/health-check.sh
```

### 璁块棶鍦板潃

瀹夎瀹屾垚鍚庯紝鍙闂互涓嬫湇鍔★細

| 鏈嶅姟 | 鍦板潃 |
|------|------|
| OpenChat API | http://localhost:3000 |
| API 鏂囨。 | http://localhost:3000/im/v3/docs |
| 鍋ュ悍妫€鏌?| http://localhost:3000/health |
| 鎮熺┖IM Demo | http://localhost:5172 |
| 鎮熺┖IM 绠＄悊鍚庡彴 | http://localhost:5300/web |

---

## 鉁?鍔熻兘鐗规€?
### 馃挰 鍗虫椂閫氳

| 鍔熻兘 | 鐘舵€?| 璇存槑 |
|------|------|------|
| 鍗曡亰 | 鉁?| 涓€瀵逛竴绉佽亰 |
| 缇よ亰 | 鉁?| 鏀寔鏈€澶?500 浜虹兢缁?|
| 娑堟伅鎾ゅ洖 | 鉁?| 2 鍒嗛挓鍐呭彲鎾ゅ洖 |
| 宸茶鍥炴墽 | 鉁?| 娑堟伅宸茶鐘舵€?|
| 澶氬獟浣撴秷鎭?| 鉁?| 鏂囨湰銆佸浘鐗囥€佽闊炽€佽棰戙€佹枃浠?|
| 娑堟伅鎼滅储 | 鉁?| 鍏ㄦ枃鎼滅储鍘嗗彶娑堟伅 |
| 绂荤嚎鎺ㄩ€?| 鉁?| 绂荤嚎娑堟伅鎺ㄩ€侀€氱煡 |

### 馃攰 瀹炴椂闊宠棰?
| 鍔熻兘 | 鐘舵€?| 璇存槑 |
|------|------|------|
| 闊抽閫氳瘽 | 鉁?| 楂樻竻璇煶閫氳瘽 |
| 瑙嗛閫氳瘽 | 鉁?| 1080P 瑙嗛閫氳瘽 |
| 灞忓箷鍏变韩 | 鉁?| 妗岄潰/绐楀彛鍏变韩 |
| 缇ょ粍閫氳瘽 | 鉁?| 澶氫汉闊宠棰戜細璁?|
| 褰曞埗鍥炴斁 | 鉁?| 閫氳瘽褰曞埗涓庡洖鏀?|

### 馃 AI 鍔╂墜

| 鍔熻兘 | 鐘舵€?| 璇存槑 |
|------|------|------|
| GPT 闆嗘垚 | 鉁?| 鍐呯疆 ChatGPT 鏀寔 |
| 鏅鸿兘瀹㈡湇 | 鉁?| 鑷姩闂瓟鏈哄櫒浜?|
| AI Bot | 鉁?| 鑷畾涔?AI 鏈哄櫒浜?|
| 澶氭ā鍨嬫敮鎸?| 鉁?| 鏀寔 OpenAI銆丆laude 绛?|

### 馃攲 绗笁鏂归泦鎴?
| 鍔熻兘 | 鐘舵€?| 璇存槑 |
|------|------|------|
| Telegram | 鉁?| 娑堟伅鍚屾 |
| WhatsApp | 鉁?| 娑堟伅鍚屾 |
| Webhook | 鉁?| 鑷畾涔夐泦鎴?|
| 寮€鏀?API | 鉁?| RESTful API |

### 馃洜锔?绯荤粺鍔熻兘

| 鍔熻兘 | 鐘舵€?| 璇存槑 |
|------|------|------|
| 鐢ㄦ埛绠＄悊 | 鉁?| 娉ㄥ唽銆佺櫥褰曘€佷釜浜鸿祫鏂?|
| 濂藉弸绯荤粺 | 鉁?| 娣诲姞銆佸垹闄ゃ€佸垎缁勭鐞?|
| 缇ょ粍绯荤粺 | 鉁?| 鍒涘缓銆佹垚鍛樼鐞嗐€佹潈闄愭帶鍒?|
| WebSocket | 鉁?| 瀹炴椂娑堟伅鎺ㄩ€?|
| 鍒嗗竷寮忛儴缃?| 鉁?| 鏀寔闆嗙兢閮ㄧ讲 |
| 鎬ц兘鐩戞帶 | 鉁?| Prometheus 鎸囨爣 |
| 瀹夊叏璁よ瘉 | 鉁?| JWT + RBAC |
| 闄愭祦淇濇姢 | 鉁?| 闃叉婊ョ敤 |

---

## 馃搧 绯荤粺鏋舵瀯

```
鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                             瀹㈡埛绔眰 (Client Layer)                         鈹?鈹溾攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?  Web App    鈹? PC Client   鈹? Mobile App  鈹?Mini Program 鈹?  IoT Device   鈹?鈹?  (React)    鈹?  (Tauri)    鈹? (React Nat) 鈹?  (寰俊)      鈹?   (ESP32)     鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹?       鈹?             鈹?             鈹?             鈹?               鈹?       鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                                    鈹?                                    鈹?WebSocket / HTTP
                                    鈻?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                          鏈嶅姟灞?(Service Layer - NestJS)                    鈹?鈹? 鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹? 鈹?鈹? 鈹?   Auth     鈹?   User     鈹?  Message   鈹?   Group    鈹?     RTC      鈹? 鈹?鈹? 鈹?  璁よ瘉鎺堟潈   鈹?  鐢ㄦ埛绠＄悊   鈹?  娑堟伅鏈嶅姟   鈹?  缇ょ粍绠＄悊   鈹?   闊宠棰?    鈹? 鈹?鈹? 鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹? 鈹?鈹? 鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹? 鈹?鈹? 鈹?  Friend    鈹?  Contact   鈹?  AI Bot    鈹? ThirdParty 鈹?     IoT      鈹? 鈹?鈹? 鈹?  濂藉弸绠＄悊   鈹?  閫氳褰?    鈹?  AI鏈哄櫒浜? 鈹?  绗笁鏂归泦鎴? 鈹?  鐗╄仈缃戣澶? 鈹? 鈹?鈹? 鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹? 鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                                    鈹?                                    鈹?SDK / API
                                    鈻?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                       娑堟伅寮曟搸灞?(Message Layer - WukongIM)                  鈹?鈹? 鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹愨攤
鈹? 鈹? 杩炴帴绠＄悊  鈹? 娑堟伅璺敱  鈹? 绂荤嚎瀛樺偍  鈹? 娑堟伅鍚屾  鈹? 鍦ㄧ嚎鐘舵€?           鈹傗攤
鈹? 鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹樷攤
鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                                    鈹?                                    鈻?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                             鏁版嵁灞?(Data Layer)                             鈹?鈹? 鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹? 鈹?鈹? 鈹? PostgreSQL  鈹?   Redis     鈹?   MinIO     鈹?Elasticsearch鈹? Prometheus鈹?鈹?鈹? 鈹?  涓绘暟鎹簱    鈹? 缂撳瓨/闃熷垪   鈹?  瀵硅薄瀛樺偍    鈹?  鎼滅储寮曟搸    鈹?  鐩戞帶     鈹?鈹?鈹? 鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹? 鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?```

---

## 馃敡 鎶€鏈爤

### 鍚庣鎶€鏈?
| 鎶€鏈?| 鐗堟湰 | 璇存槑 |
|------|------|------|
| [NestJS](https://nestjs.com/) | 11.x | 浼佷笟绾?Node.js 妗嗘灦 |
| [TypeScript](https://www.typescriptlang.org/) | 5.9+ | 绫诲瀷瀹夊叏鐨?JavaScript |
| [TypeORM](https://typeorm.io/) | 0.3.x | 寮哄ぇ鐨?ORM 妗嗘灦 |
| [PostgreSQL](https://www.postgresql.org/) | 15+ | 楂樻€ц兘鍏崇郴鏁版嵁搴?|
| [Redis](https://redis.io/) | 7+ | 鍐呭瓨鏁版嵁搴撳拰娑堟伅闃熷垪 |
| [BullMQ](https://docs.bullmq.io/) | 5.x | 娑堟伅闃熷垪 |
| [Socket.IO](https://socket.io/) | 4.x | 瀹炴椂閫氫俊 |
| [WukongIM](https://githubim.com/) | v2 | 涓撲笟 IM 寮曟搸 |
| [Passport](http://www.passportjs.org/) | 0.7+ | 璁よ瘉涓棿浠?|
| [JWT](https://jwt.io/) | - | 鍩轰簬浠ょ墝鐨勮璇?|

### DevOps

| 鎶€鏈?| 璇存槑 |
|------|------|
| Docker | 瀹瑰櫒鍖栭儴缃?|
| Docker Compose | 澶氬鍣ㄧ紪鎺?|
| Kubernetes | 闆嗙兢缂栨帓 |
| Prometheus | 鐩戞帶鍛婅 |
| GitHub Actions | CI/CD |

---

## 馃摎 API 鏂囨。

### Swagger UI

鍚姩鏈嶅姟鍚庤闂細

```
http://localhost:3000/im/v3/docs
```

### API 绔偣

| 妯″潡 | 绔偣 | 璇存槑 |
|------|------|------|
| 璁よ瘉 | `/api/auth/*` | 鐧诲綍銆佹敞鍐屻€乀oken 鍒锋柊 |
| 鐢ㄦ埛 | `/api/users/*` | 鐢ㄦ埛淇℃伅銆佽祫鏂欑鐞?|
| 娑堟伅 | `/api/messages/*` | 娑堟伅鍙戦€併€佸巻鍙叉煡璇?|
| 缇ょ粍 | `/api/groups/*` | 缇ょ粍鍒涘缓銆佹垚鍛樼鐞?|
| 濂藉弸 | `/api/friends/*` | 濂藉弸鐢宠銆佸垪琛ㄧ鐞?|
| 鑱旂郴浜?| `/api/contacts/*` | 閫氳褰曠鐞?|
| 闊宠棰?| `/api/rtc/*` | 閫氳瘽淇′护銆佹埧闂寸鐞?|

### 瀹屾暣 API 鏂囨。

璇︾粏 API 鏂囨。璇峰弬鑰?[API 鏂囨。](./docs/zh/api/index.md)銆?
閮ㄧ讲涓庡畨瑁呭懡浠ら€熸煡璇峰弬鑰?[鍛戒护閫熸煡](./docs/COMMANDS_CN.md)銆?
---

## 馃彈锔?椤圭洰缁撴瀯

```
openchat/
鈹溾攢鈹€ 馃搧 src/                        # 鏈嶅姟绔簮鐮?鈹?  鈹溾攢鈹€ 馃搧 common/                 # 鍏叡妯″潡
鈹?  鈹?  鈹溾攢鈹€ 馃搧 auth/               # 璁よ瘉鎺堟潈
鈹?  鈹?  鈹?  鈹溾攢鈹€ guards/            # 璁よ瘉瀹堝崼
鈹?  鈹?  鈹?  鈹溾攢鈹€ strategies/        # 璁よ瘉绛栫暐
鈹?  鈹?  鈹?  鈹溾攢鈹€ auth-manager.service.ts
鈹?  鈹?  鈹?  鈹溾攢鈹€ permissions.decorator.ts
鈹?  鈹?  鈹?  鈹溾攢鈹€ permissions.guard.ts
鈹?  鈹?  鈹?  鈹斺攢鈹€ token-blacklist.service.ts
鈹?  鈹?  鈹溾攢鈹€ 馃搧 base/               # 鍩虹绫?鈹?  鈹?  鈹溾攢鈹€ 馃搧 cache/              # 缂撳瓨鏈嶅姟
鈹?  鈹?  鈹溾攢鈹€ 馃搧 config/             # 閰嶇疆绠＄悊
鈹?  鈹?  鈹溾攢鈹€ 馃搧 constants/          # 甯搁噺瀹氫箟
鈹?  鈹?  鈹溾攢鈹€ 馃搧 dto/                # 鏁版嵁浼犺緭瀵硅薄
鈹?  鈹?  鈹溾攢鈹€ 馃搧 events/             # 浜嬩欢鎬荤嚎
鈹?  鈹?  鈹溾攢鈹€ 馃搧 exceptions/         # 寮傚父澶勭悊
鈹?  鈹?  鈹溾攢鈹€ 馃搧 filters/            # 杩囨护鍣?鈹?  鈹?  鈹溾攢鈹€ 馃搧 health/             # 鍋ュ悍妫€鏌?鈹?  鈹?  鈹溾攢鈹€ 馃搧 interceptors/       # 鎷︽埅鍣?鈹?  鈹?  鈹溾攢鈹€ 馃搧 logger/             # 鏃ュ織鏈嶅姟
鈹?  鈹?  鈹溾攢鈹€ 馃搧 metrics/            # 鎬ц兘鐩戞帶
鈹?  鈹?  鈹溾攢鈹€ 馃搧 queue/              # 娑堟伅闃熷垪
鈹?  鈹?  鈹溾攢鈹€ 馃搧 redis/              # Redis 鏈嶅姟
鈹?  鈹?  鈹溾攢鈹€ 馃搧 throttler/          # 闄愭祦
鈹?  鈹?  鈹斺攢鈹€ 馃搧 utils/              # 宸ュ叿鍑芥暟
鈹?  鈹溾攢鈹€ 馃搧 gateways/               # WebSocket 缃戝叧
鈹?  鈹溾攢鈹€ 馃搧 modules/                # 涓氬姟妯″潡
鈹?  鈹?  鈹溾攢鈹€ 馃搧 agent/              # 鏅鸿兘浠ｇ悊
鈹?  鈹?  鈹溾攢鈹€ 馃搧 ai-bot/             # AI 鏈哄櫒浜?鈹?  鈹?  鈹溾攢鈹€ 馃搧 bot-platform/       # 鏈哄櫒浜哄钩鍙?鈹?  鈹?  鈹溾攢鈹€ 馃搧 contact/            # 鑱旂郴浜?鈹?  鈹?  鈹溾攢鈹€ 馃搧 conversation/       # 浼氳瘽绠＄悊
鈹?  鈹?  鈹溾攢鈹€ 馃搧 friend/             # 濂藉弸绯荤粺
鈹?  鈹?  鈹溾攢鈹€ 馃搧 group/              # 缇ょ粍绯荤粺
鈹?  鈹?  鈹溾攢鈹€ 馃搧 im-provider/        # IM 鎻愪緵鑰?鈹?  鈹?  鈹溾攢鈹€ 馃搧 iot/                # 鐗╄仈缃?鈹?  鈹?  鈹溾攢鈹€ 馃搧 message/            # 娑堟伅绯荤粺
鈹?  鈹?  鈹溾攢鈹€ 馃搧 rtc/                # 瀹炴椂闊宠棰?鈹?  鈹?  鈹溾攢鈹€ 馃搧 third-party/        # 绗笁鏂归泦鎴?鈹?  鈹?  鈹溾攢鈹€ 馃搧 user/               # 鐢ㄦ埛绯荤粺
鈹?  鈹?  鈹斺攢鈹€ 馃搧 wukongim/           # 鎮熺┖IM 闆嗘垚
鈹?  鈹溾攢鈹€ app.module.ts              # 搴旂敤妯″潡
鈹?  鈹溾攢鈹€ bootstrap.ts               # 鍚姩寮曞
鈹?  鈹溾攢鈹€ data-source.ts             # 鏁版嵁婧愰厤缃?鈹?  鈹斺攢鈹€ main.ts                    # 鍏ュ彛鏂囦欢
鈹溾攢鈹€ 馃搧 sdk/                        # SDK 鐩綍
鈹?  鈹溾攢鈹€ 馃搧 typescript/             # TypeScript SDK
鈹?  鈹溾攢鈹€ 馃搧 android/                # Android SDK
鈹?  鈹溾攢鈹€ 馃搧 ios/                    # iOS SDK
鈹?  鈹溾攢鈹€ 馃搧 flutter/                # Flutter SDK
鈹?  鈹溾攢鈹€ 馃搧 python/                 # Python SDK
鈹?  鈹斺攢鈹€ 馃搧 nodejs/                 # Node.js SDK
鈹溾攢鈹€ 馃搧 app/                        # 搴旂敤鐩綍
鈹?  鈹溾攢鈹€ 馃搧 openchat/               # 涓诲簲鐢?鈹?  鈹溾攢鈹€ 馃搧 openchat-admin/         # 绠＄悊鍚庡彴
鈹?  鈹溾攢鈹€ 馃搧 openchat-react-mobile/  # 绉诲姩绔?鈹?  鈹斺攢鈹€ 馃搧 openchat-react-pc/      # PC 绔?鈹溾攢鈹€ 馃搧 docs/                       # 鏂囨。
鈹?  鈹溾攢鈹€ 馃搧 assets/                 # 璧勬簮鏂囦欢
鈹?  鈹?  鈹溾攢鈹€ 馃搧 images/             # 鍥剧墖
鈹?  鈹?  鈹?  鈹溾攢鈹€ 馃搧 branding/       # 鍝佺墝鍥剧墖
鈹?  鈹?  鈹?  鈹?  鈹斺攢鈹€ logo.png       # 椤圭洰 Logo
鈹?  鈹?  鈹?  鈹溾攢鈹€ 馃搧 screenshots/    # 鎴浘
鈹?  鈹?  鈹?  鈹斺攢鈹€ 馃搧 social/         # 绀句氦濯掍綋
鈹?  鈹?  鈹?      鈹斺攢鈹€ wechat-qr.png  # 寰俊浜岀淮鐮?鈹?  鈹?  鈹溾攢鈹€ 馃搧 videos/             # 瑙嗛
鈹?  鈹?  鈹斺攢鈹€ 馃搧 icons/              # 鍥炬爣
鈹?  鈹溾攢鈹€ 馃搧 api/                    # API 鏂囨。
鈹?  鈹溾攢鈹€ 馃搧 guide/                  # 浣跨敤鎸囧崡
鈹?  鈹斺攢鈹€ 馃搧 sdk/                    # SDK 鏂囨。
鈹溾攢鈹€ 馃搧 database/                   # 鏁版嵁搴?鈹?  鈹溾攢鈹€ schema.sql                 # 鏁版嵁搴撶粨鏋?鈹?  鈹溾攢鈹€ seed.sql                   # 鍒濆鏁版嵁
鈹?  鈹斺攢鈹€ indexes-optimization.sql   # 绱㈠紩浼樺寲
鈹溾攢鈹€ 馃搧 k8s/                        # Kubernetes 閰嶇疆
鈹?  鈹溾攢鈹€ 馃搧 base/                   # 鍩虹閰嶇疆
鈹?  鈹斺攢鈹€ 馃搧 overlays/               # 鐜閰嶇疆
鈹溾攢鈹€ 馃搧 scripts/                    # 鑴氭湰
鈹?  鈹溾攢鈹€ quick-start.sh             # 蹇€熷惎鍔?鈹?  鈹溾攢鈹€ install.sh                 # 瀹夎鑴氭湰 (Linux/macOS)
鈹?  鈹溾攢鈹€ install.ps1                # PowerShell 瀹夎鑴氭湰 (Windows)
鈹?  鈹溾攢鈹€ setup-wizard.sh            # 浜や簰寮忓畨瑁呭悜瀵?鈹?  鈹溾攢鈹€ install-manager.sh         # 瀹夎鐘舵€佺鐞?鈹?  鈹溾攢鈹€ install-test.sh            # 瀹夎楠岃瘉娴嬭瘯
鈹?  鈹溾攢鈹€ precheck.sh                # 绯荤粺棰勬鏌?鈹?  鈹溾攢鈹€ diagnose.sh                # 閿欒璇婃柇宸ュ叿
鈹?  鈹溾攢鈹€ auto-fix.sh                # 鑷姩淇宸ュ叿
鈹?  鈹溾攢鈹€ log-analyzer.sh            # 鏃ュ織鍒嗘瀽宸ュ叿
鈹?  鈹溾攢鈹€ health-check.sh            # 鍋ュ悍鐩戞帶
鈹?  鈹溾攢鈹€ post-install.sh            # 瀹夎鍚庨厤缃?鈹?  鈹斺攢鈹€ uninstall.sh               # 鍗歌浇鑴氭湰
鈹溾攢鈹€ 馃搧 test/                       # 娴嬭瘯
鈹?  鈹溾攢鈹€ __mocks__/                 # Mock 鏂囦欢
鈹?  鈹溾攢鈹€ app.e2e-spec.ts            # E2E 娴嬭瘯
鈹?  鈹斺攢鈹€ setup.ts                   # 娴嬭瘯閰嶇疆
鈹溾攢鈹€ 馃搧 xiaozhi-esp32/              # ESP32 IoT 鍥轰欢
鈹溾攢鈹€ .env.example                   # 鐜鍙橀噺绀轰緥
鈹溾攢鈹€ docker-compose.yml             # Docker 缂栨帓
鈹溾攢鈹€ Dockerfile                     # Docker 闀滃儚
鈹溾攢鈹€ jest.config.js                 # Jest 閰嶇疆
鈹溾攢鈹€ package.json                   # 椤圭洰閰嶇疆
鈹溾攢鈹€ tsconfig.json                  # TypeScript 閰嶇疆
鈹溾攢鈹€ LICENSE                        # 璁稿彲璇?鈹溾攢鈹€ README.md                      # 鑻辨枃鏂囨。
鈹斺攢鈹€ README_CN.md                   # 涓枃鏂囨。
```

---

## 馃寪 闆嗘垚

### WukongIM 闆嗘垚

OpenChat 涓?WukongIM 娣卞害闆嗘垚锛屾彁渚涘彲闈犵殑瀹炴椂娑堟伅鏈嶅姟锛?
| 鍔熻兘 | 璇存槑 |
|------|------|
| 娑堟伅鍙戦€?| 鎵€鏈夋秷鎭€氳繃 WukongIM 鍙戦€?|
| 鐢ㄦ埛鍚屾 | 鏈湴鏁版嵁搴撲笌 WukongIM 鐢ㄦ埛鏁版嵁鍚屾 |
| 缇ょ粍鍚屾 | 缇ょ粍鏁版嵁鍙屽悜鍚屾 |
| 娑堟伅纭 | 鏀寔娑堟伅閫佽揪纭鍜屽凡璇诲洖鎵?|
| 鍦ㄧ嚎鐘舵€?| 瀹炴椂鍦ㄧ嚎鐘舵€佺鐞?|

### 绗笁鏂规湇鍔?
| 鏈嶅姟 | 鐘舵€?| 璇存槑 |
|------|------|------|
| Telegram | 鉁?| 娑堟伅鍚屾 |
| WhatsApp | 鉁?| 娑堟伅鍚屾 |
| Webhook | 鉁?| 鑷畾涔夐泦鎴?|

---

## 鈿?鎬ц兘浼樺寲

### 鏁版嵁搴撲紭鍖?
- **杩炴帴姹犵鐞?*锛氫紭鍖栫殑杩炴帴姹犲ぇ灏忓拰瓒呮椂璁剧疆
- **绱㈠紩浼樺寲**锛氬叧閿瓧娈电储寮曪紝鏌ヨ鎬ц兘鎻愬崌 10x
- **鎵归噺鎿嶄綔**锛氭壒閲忔彃鍏ュ拰鏇存柊锛屽噺灏戞暟鎹簱寰€杩?
### 缂撳瓨绛栫暐

- **Redis 缂撳瓨**锛氱儹鐐规暟鎹紦瀛橈紝鍑忓皯鏁版嵁搴撴煡璇?- **鏈湴缂撳瓨**锛歀RU 缂撳瓨锛屽噺灏戠綉缁滃紑閿€
- **缂撳瓨棰勭儹**锛氬惎鍔ㄦ椂棰勫姞杞界儹鐐规暟鎹?
### 娑堟伅澶勭悊

- **娑堟伅闃熷垪**锛氬紓姝ュ鐞嗚€楁椂鎿嶄綔
- **鎵归噺鍙戦€?*锛氱兢娑堟伅鎵归噺澶勭悊
- **鎸囨暟閫€閬块噸璇?*锛氭彁楂樻秷鎭彂閫佸彲闈犳€?
### 骞跺彂鎺у埗

- **闄愭祦淇濇姢**锛氶槻姝㈢郴缁熻繃杞?- **骞跺彂闄愬埗**锛氭帶鍒跺苟鍙戣姹傛暟閲?- **浼橀泤闄嶇骇**锛氶珮璐熻浇鏃惰嚜鍔ㄩ檷绾?
---

## 馃敀 瀹夊叏

### 璁よ瘉鎺堟潈

| 鍔熻兘 | 璇存槑 |
|------|------|
| JWT 璁よ瘉 | 瀹夊叏鐨勭敤鎴疯璇佹満鍒?|
| 澶氬洜绱犺璇?| 鏀寔澶氱璁よ瘉鏂瑰紡 |
| Token 榛戝悕鍗?| 鏀寔涓诲姩鐧诲嚭 |
| RBAC 鏉冮檺 | 鍩轰簬瑙掕壊鐨勮闂帶鍒?|

### 瀹夊叏闃叉姢

| 鍔熻兘 | 璇存槑 |
|------|------|
| CORS 閰嶇疆 | 璺ㄥ煙璧勬簮鍏变韩閰嶇疆 |
| Helmet 瀹夊叏澶?| 澧炲己搴旂敤瀹夊叏鎬?|
| 杈撳叆楠岃瘉 | 闃叉鎭舵剰杈撳叆 |
| 闄愭祦淇濇姢 | 闃叉鏆村姏鐮磋В |
| 鏁忔劅淇℃伅鑴辨晱 | 鏃ュ織鑷姩鑴辨晱 |

---

## 馃搳 鐩戞帶涓庢棩蹇?
### 鎬ц兘鐩戞帶

- **Prometheus 鎸囨爣**锛氬疄鏃舵敹闆嗙郴缁熸€ц兘鎸囨爣
- **鍋ュ悍妫€鏌?*锛氱郴缁熷仴搴风姸鎬佹鏌?- **鎬ц兘杩借釜**锛氳姹傝€楁椂杩借釜

### 鏃ュ織绠＄悊

- **缁撴瀯鍖栨棩蹇?*锛欽SON 鏍煎紡鏃ュ織杈撳嚭
- **鏃ュ織绾у埆**锛氭敮鎸?debug/info/warn/error 绾у埆
- **鏃ュ織鏂囦欢**锛氭敮鎸佹枃浠惰緭鍑哄拰鏃ュ織杞浆
- **璇锋眰杩借釜**锛氳姹?ID 杩借釜

---

## 馃摝 閮ㄧ讲

### Docker Compose 閮ㄧ讲锛堟帹鑽愶級

```bash
# 寮€鍙戠幆澧冿紙鍖呭惈 PostgreSQL銆丷edis銆乄ukongIM銆丳rometheus锛?docker compose up -d

# 鐢熶骇鐜
docker compose -f docker-compose.prod.yml up -d

# 浣跨敤澶栭儴鏁版嵁搴撳拰 Redis
docker compose -f docker-compose.external-db.yml up -d

# 鎵╁睍鏈嶅姟
docker compose up -d --scale app=3
```

### Docker 鐙珛閮ㄧ讲

```bash
# 鏋勫缓闀滃儚
docker build -t openchat/server:latest .

# 杩愯瀹瑰櫒锛堥渶瑕佸閮?PostgreSQL 鍜?Redis锛?docker run -d \
  --name openchat \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_USERNAME=openchat \
  -e DB_PASSWORD=your-password \
  -e DB_NAME=openchat \
  -e REDIS_HOST=your-redis-host \
  -e REDIS_PORT=6379 \
  -e JWT_SECRET=your-jwt-secret \
  openchat/server:latest
```

### Kubernetes 閮ㄧ讲

```bash
# 閮ㄧ讲鍒?Kubernetes
kubectl apply -k k8s/overlays/production

# 鏌ョ湅閮ㄧ讲鐘舵€?kubectl get pods -n openchat
```

---

## 馃懆鈥嶐煉?寮€鍙戞寚鍗?
### 浠ｇ爜瑙勮寖

- 浣跨敤 TypeScript 涓ユ牸妯″紡
- 閬靛惊 NestJS 浠ｇ爜椋庢牸鎸囧崡
- 浣跨敤 ESLint + Prettier 淇濊瘉浠ｇ爜璐ㄩ噺

### 寮€鍙戝懡浠?
```bash
# 鍚姩寮€鍙戞湇鍔″櫒
npm run start:dev

# 浠ｇ爜鏍煎紡鍖?npm run format

# 浠ｇ爜妫€鏌?npm run lint

# 绫诲瀷妫€鏌?npm run lint:types
```

### 鏁版嵁搴撳垵濮嬪寲涓庤ˉ涓?
```bash
# 鍏ㄦ柊鏁版嵁搴撳垵濮嬪寲锛坰chema + 鍙€?seed锛?./scripts/init-database.sh development

# 瀛橀噺鏁版嵁搴撹ˉ涓佸崌绾э紙patches锛?./scripts/apply-db-patches.sh development
```

---

## 馃И 娴嬭瘯

```bash
# 杩愯鍗曞厓娴嬭瘯
npm run test

# 杩愯娴嬭瘯瑕嗙洊鐜?npm run test:cov

# 杩愯 E2E 娴嬭瘯
npm run test:e2e

# 鐩戣妯″紡
npm run test:watch
```

---

## 鉂?甯歌闂

### 璇婃柇宸ュ叿

OpenChat 鎻愪緵浜嗕竴濂楀畬鏁寸殑璇婃柇鍜屼慨澶嶅伐鍏凤細

```bash
# 绯荤粺棰勬鏌?./scripts/precheck.sh

# 杩愯璇婃柇
./scripts/diagnose.sh

# 鑷姩淇甯歌闂
./scripts/auto-fix.sh --all

# 鍒嗘瀽鏃ュ織
./scripts/log-analyzer.sh analyze

# 鍋ュ悍鐩戞帶
./scripts/health-check.sh --monitor
```

### 甯歌闂

#### WukongIM 杩炴帴闂

1. 妫€鏌?WukongIM 鏈嶅姟鏄惁杩愯锛歚docker ps | grep wukongim`
2. 楠岃瘉 `WUKONGIM_API_URL` 閰嶇疆
3. 妫€鏌ョ綉缁滆繛閫氭€э細`./scripts/diagnose.sh --network`

#### 鏁版嵁搴撹繛鎺ラ棶棰?
1. 纭繚 PostgreSQL 鏈嶅姟杩愯锛歚docker ps | grep postgres`
2. 楠岃瘉 `.env` 涓殑鏁版嵁搴撻厤缃?3. 妫€鏌ユ暟鎹簱鐢ㄦ埛鏉冮檺
4. 杩愯锛歚./scripts/auto-fix.sh --database`

#### Redis 杩炴帴闂

1. 妫€鏌?Redis 鏈嶅姟鏄惁杩愯锛歚docker ps | grep redis`
2. 楠岃瘉 Redis 閰嶇疆
3. 杩愯锛歚./scripts/auto-fix.sh --redis`

#### 瀹瑰櫒闂

1. 妫€鏌ュ鍣ㄧ姸鎬侊細`docker compose ps`
2. 鏌ョ湅瀹瑰櫒鏃ュ織锛歚./scripts/log-analyzer.sh containers`
3. 閲嶅惎瀹瑰櫒锛歚./scripts/auto-fix.sh --containers`

#### 瀹夎闂

1. 妫€鏌ュ畨瑁呯姸鎬侊細`./scripts/install-manager.sh status`
2. 鎭㈠涓柇鐨勫畨瑁咃細`./scripts/install-manager.sh resume`
3. 閲嶇疆瀹夎锛歚./scripts/install-manager.sh reset`

璇︾粏鏁呴殰鎺掗櫎鎸囧崡璇峰弬鑰?[瀹夎鏂囨。](./INSTALL_CN.md) 涓?[鍛戒护閫熸煡](./docs/COMMANDS_CN.md)

---

## 馃 璐＄尞鎸囧崡

鎴戜滑娆㈣繋鎵€鏈夊舰寮忕殑璐＄尞锛?
### 璐＄尞姝ラ

1. Fork 鏈粨搴?2. 鍒涘缓鐗规€у垎鏀?(`git checkout -b feature/AmazingFeature`)
3. 鎻愪氦鏇存敼 (`git commit -m 'Add some AmazingFeature'`)
4. 鎺ㄩ€佸埌鍒嗘敮 (`git push origin feature/AmazingFeature`)
5. 鍒涘缓 Pull Request

### 琛屼负鍑嗗垯

璐＄尞鍓嶈闃呰 [琛屼负鍑嗗垯](CODE_OF_CONDUCT.md)

### 璐＄尞鎸囧崡

璇︾粏璐＄尞鎸囧崡璇峰弬鑰?[璐＄尞鎸囧崡](CONTRIBUTING.md)

---

## 馃搫 璁稿彲璇?
OpenChat 鏄紑婧愯蒋浠讹紝浣跨敤 [AGPL-3.0 璁稿彲璇乚(LICENSE) 鎺堟潈銆?
---

## 馃挰 绀惧尯

鍔犲叆鎴戜滑鐨勭ぞ鍖猴紝鑾峰彇甯姪銆佸垎浜兂娉曘€佸弬涓庨」鐩紒

| 骞冲彴 | 閾炬帴 |
|------|------|
| GitHub Discussions | [![GitHub Discussions](https://img.shields.io/badge/GitHub%20Discussions-181717?logo=github&logoColor=white)](https://github.com/Sdkwork-Cloud/openchat/discussions) |
| X (Twitter) | [![X](https://img.shields.io/badge/X-1DA1F2?logo=x&logoColor=white)](https://x.com/openchat_cloud) |
| Discord | [![Discord](https://img.shields.io/badge/Discord-7289DA?logo=discord&logoColor=white)](https://discord.gg/openchat) |
| 寰俊鍏紬鍙?| 鎵弿涓嬫柟浜岀淮鐮?|
| 閭 | [![Email](https://img.shields.io/badge/Email-D14836?logo=gmail&logoColor=white)](mailto:contact@sdkwork.com) |

<div align="center">
  <img src="./docs/assets/images/social/wechat-qr.png" width="200" alt="寰俊鍏紬鍙蜂簩缁寸爜">
  <p>OpenChat 瀹樻柟鍏紬鍙?/p>
</div>

---

## 馃摲 鎴浘

<div align="center">

### Web 鐣岄潰

<img src="./docs/assets/images/screenshots/web/chat.png" width="300" alt="Web 鑱婂ぉ鐣岄潰">
<img src="./docs/assets/images/screenshots/web/group.png" width="300" alt="Web 缇ょ粍鐣岄潰">

### 绉诲姩绔晫闈?
<img src="./docs/assets/images/screenshots/mobile/chat.png" width="200" alt="绉诲姩绔亰澶╃晫闈?>
<img src="./docs/assets/images/screenshots/mobile/profile.png" width="200" alt="绉诲姩绔釜浜鸿祫鏂欑晫闈?>

### 瑙嗛閫氳瘽

<img src="./docs/assets/images/screenshots/video/call.png" width="300" alt="瑙嗛閫氳瘽鐣岄潰">

</div>

---

<div align="center">

**濡傛灉杩欎釜椤圭洰瀵逛綘鏈夊府鍔╋紝璇风粰鎴戜滑涓€涓?猸愶笍 Star锛?*

[![Star History Chart](https://api.star-history.com/svg?repos=Sdkwork-Cloud/openchat&type=Date)](https://star-history.com/#Sdkwork-Cloud/openchat&Date)

---

漏 2024 Sdkwork Cloud. All rights reserved.

</div>
