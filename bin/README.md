# OpenChat Bin Scripts

`bin/` now exposes thin platform wrappers over one shared implementation: [`scripts/openchat-cli.cjs`](/opt/source/openchat/scripts/openchat-cli.cjs).

## Supported Entrypoints

| Script             | Platform                          | Notes               |
| ------------------ | --------------------------------- | ------------------- |
| `bin/openchat`     | Linux / macOS                     | POSIX shell wrapper |
| `bin/openchat.ps1` | Windows PowerShell / PowerShell 7 | Windows entrypoint  |

Windows support is PowerShell-only. Batch wrappers are intentionally removed.

## Available Commands

Both wrappers forward the same runtime commands:

- `start`
- `stop`
- `restart`
- `status`
- `console`
- `health`
- `logs`
- `clean`
- `help`

## Examples

### Linux / macOS

```bash
./bin/openchat help
./bin/openchat start --environment development
PORT=8080 ./bin/openchat restart --environment production
./bin/openchat status --environment production
./bin/openchat logs --environment production
```

### Windows PowerShell

```powershell
.\bin\openchat.ps1 help
.\bin\openchat.ps1 start --environment development
.\bin\openchat.ps1 restart --environment production --port 8080
.\bin\openchat.ps1 status --environment production
.\bin\openchat.ps1 logs --environment production
```

## Implementation Model

- Runtime and deployment behavior lives in `scripts/openchat-cli.cjs`.
- Shell and PowerShell files only resolve paths and forward arguments.
- Cross-platform behavior should be added in the shared CLI, not duplicated in wrappers.

## Related Scripts

Deployment helpers in `scripts/` follow the same model:

- `scripts/install.sh` / `scripts/install.ps1`
- `scripts/deploy-server.sh` / `scripts/deploy-server.ps1`
- `scripts/configure-edge.sh` / `scripts/configure-edge.ps1`
- `scripts/quick-install.sh` / `scripts/quick-install.ps1`
- `scripts/precheck.sh` / `scripts/precheck.ps1`
- `scripts/init-database.sh` / `scripts/init-database.ps1`
- `scripts/apply-db-patches.sh` / `scripts/apply-db-patches.ps1`
- `scripts/install-manager.sh` / `scripts/install-manager.ps1`
- `scripts/setup-wizard.sh` / `scripts/setup-wizard.ps1`
