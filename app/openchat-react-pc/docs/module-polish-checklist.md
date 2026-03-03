# OpenChat PC Module Polish Checklist

## Objective
Use a module-by-module workflow to reach a desktop-grade product experience (WeChat/ChatGPT style), with consistent layout, interaction feedback, and data behavior.

## Baseline Criteria (all modules)
- Desktop split layout where applicable (`left list / right detail`).
- Stable empty/loading/error states (no white screen or broken action).
- Action loop closed: every primary button has real effect and user feedback.
- Unified visual language: spacing, typography, status colors, selection state.
- Route integration verified: sidebar icon click must land on a usable page.

## Progress
- `im` (chat): done, split layout and SDK/fallback flow available.
- `contacts`: done, split layout + group management actions available.
- `agent`: done (this round), upgraded to desktop tri-pane market and session-centric detail workspace.
- `skill`: done (this round), upgraded to discover-enable-configure pipeline with governance/config validation cues.
- `appstore`: done (this round), upgraded to faceted store IA with ranking lanes and capability route mapping.
- `notification`: done (this round), upgraded to desktop dual-pane center.
- `device`: done (this round), upgraded to desktop dual-pane management.
- `discover`: done (this round), upgraded to desktop dual-pane discovery + detail workspace.
- `wallet`: done (this round), upgraded to transaction-workbench with operation side panels.
- `terminal`: done (this round), upgraded to session workspace with history and quick commands.
- `commerce`: done (this round), upgraded mall/cart to desktop split workspaces.
- `social`: done (this round), upgraded moments feed to split stream/thread workspace.

## Next Modules (priority order)
1. `creation`: improve create/result/history workspace.
2. `tools`: unify selector/config/run feedback loops.
3. `settings`: improve account/model/privacy operational workflows.
4. `drive`: strengthen cloud file workflows and permission feedback.
5. `auth`: enrich account security and session-device management UX.

## Verification Commands
- `pnpm run typecheck`
- `pnpm run typecheck:packages`
- `pnpm run test`
- `pnpm run build`
- `pnpm run verify:packages`
