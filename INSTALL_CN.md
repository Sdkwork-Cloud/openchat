# OpenChat 鏈嶅姟绔畨瑁呮寚鍗楋紙涓枃锛?
鏈枃妗ｅ熀浜庡綋鍓嶄粨搴撶湡瀹炶剼鏈笌鍛戒护缂栧啓锛岄€傜敤浜庡叏鏂扮幆澧冨畨瑁呬笌瀛橀噺鐜鍗囩骇銆?
## 1. 鐜瑕佹眰

- 鎿嶄綔绯荤粺锛歀inux / macOS / Windows锛堟帹鑽?WSL2锛?- Node.js锛?8+
- PostgreSQL锛?5+
- Redis锛?+
- 蹇呰鍛戒护锛歚npm`銆乣psql`銆乣redis-cli`

## 2. 瀹夎鍩虹渚濊禆锛圲buntu 绀轰緥锛?
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib redis-server
```

鍚姩鏈嶅姟骞惰缃紑鏈鸿嚜鍚細

```bash
sudo systemctl enable --now postgresql
sudo systemctl enable --now redis-server
```

楠岃瘉锛?
```bash
sudo -u postgres psql -c "SELECT version();"
redis-cli ping
```

## 3. 鍒涘缓鏁版嵁搴撲笌璐﹀彿

```bash
sudo -u postgres psql
```

鎵ц锛?
```sql
CREATE USER openchat_user WITH PASSWORD 'change_this_password';
CREATE DATABASE openchat OWNER openchat_user;
\q
```

## 4. PostgreSQL 杩滅▼璁块棶涓庤璇侊紙鎸夐渶锛?
鍏堟煡璇㈤厤缃枃浠朵綅缃紝涓嶅啓姝荤増鏈彿鐩綍锛?
```bash
sudo -u postgres psql -tAc "SHOW hba_file;"
sudo -u postgres psql -tAc "SHOW config_file;"
```

缂栬緫 `pg_hba.conf`锛岃拷鍔狅細

```conf
host    openchat    openchat_user    0.0.0.0/0    scram-sha-256
host    openchat    openchat_user    ::/0         scram-sha-256
```

缂栬緫 `postgresql.conf`锛岀‘璁わ細

```conf
listen_addresses = '*'
port = 5432
```

閲嶅惎 PostgreSQL锛?
```bash
sudo systemctl restart postgresql
```

## 5. 鑾峰彇浠ｇ爜骞跺畨瑁呬緷璧?
```bash
git clone <your-openchat-repo-url> openchat-server
cd openchat-server
npm install
```

濡傛灉浣犵殑鐩綍鍚嶄笉鏄?`openchat-server`锛岃鏀逛负瀹為檯鐩綍銆?
## 6. 閰嶇疆鐜鍙橀噺

寮€鍙戠幆澧冩帹鑽愶細

```bash
cp .env.example .env.development
```

缂栬緫 `.env.development`锛岃嚦灏戠‘璁や互涓嬮厤缃細

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=openchat_user
DB_PASSWORD=change_this_password
DB_NAME=openchat

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 7. 鍒濆鍖栨暟鎹簱锛堝叏鏂版暟鎹簱锛?
Linux / macOS锛?
```bash
chmod +x scripts/init-database.sh
./scripts/init-database.sh development
```

Windows PowerShell锛?
```powershell
.\scripts\init-database.ps1 -Environment development
```

璇存槑锛?
- 鑴氭湰浼氭墽琛?`database/schema.sql`
- 闈炵敓浜х幆澧冨彲閫夋嫨鏄惁瀵煎叆 `database/seed.sql`
- 鏀寔鐜鍒悕锛歚dev|development`銆乣test`銆乣prod|production`

## 8. 瀛橀噺鏁版嵁搴撳崌绾э紙鍦ㄧ嚎琛ヤ竵锛?
鍙戝竷鏂扮増鏈墠鍏堟墽琛岃ˉ涓侊細

Linux / macOS锛?
```bash
./scripts/apply-db-patches.sh production
```

Windows PowerShell锛?
```powershell
.\scripts\apply-db-patches.ps1 -Environment production
```

璇存槑锛?
- 琛ヤ竵鏉ユ簮锛歚database/patches/*.sql`
- 鎵ц璁板綍琛細`chat_schema_migrations`
- 鏀寔閲嶅鎵ц锛屽凡鎵ц琛ヤ竵浼氳嚜鍔ㄨ烦杩?
## 9. 鍚姩鏈嶅姟

寮€鍙戠幆澧冿細

```bash
npm run start:dev
```

鐢熶骇鐜锛?
```bash
npm run build
npm run start:prod
```

## 10. 楠岃瘉瀹夎

```bash
curl -f http://localhost:3000/health
```

鍙€夛細

```bash
./scripts/health-check.sh
```

Swagger 鏂囨。锛?
- `http://localhost:3000/im/v3/docs`

## 11. 甯歌鏁呴殰鎺掓煡

### 11.1 `password authentication failed`

```bash
sudo -u postgres psql -c "ALTER USER openchat_user WITH PASSWORD 'new_password';"
```

骞跺悓姝ユ洿鏂?`.env.*` 涓殑 `DB_PASSWORD`銆?
### 11.2 `connection refused`

渚濇妫€鏌ワ細

```bash
sudo systemctl status postgresql
sudo systemctl status redis-server
ss -lntp | rg '5432|6379|3000'
```

### 11.3 `psql: command not found`

瀹夎 PostgreSQL 瀹㈡埛绔苟纭鍦?PATH锛?
```bash
command -v psql
```

## 12. 澶囦唤涓庢仮澶?
澶囦唤锛?
```bash
pg_dump -h localhost -U openchat_user -d openchat -F c -b -v -f openchat_backup.dump
```

鎭㈠锛?
```bash
pg_restore -h localhost -U openchat_user -d openchat -v openchat_backup.dump
```

## 13. 鍙傝€冩枃妗?
- 閮ㄧ讲鎸囧崡锛歚DEPLOYMENT.md`
- 鏁版嵁搴撹鏄庯細`database/README.md`
- 鍛戒护閫熸煡锛歚docs/COMMANDS_CN.md`

