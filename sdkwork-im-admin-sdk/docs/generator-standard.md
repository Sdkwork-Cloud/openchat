# Generator Standard

1. The admin workspace refreshes from `/admin/im/v3/openapi.json`.
2. Only `generated/server-openapi` is generator-owned.
3. The handwritten `composed` package must stay unchanged across regeneration.
4. Missing admin endpoints are fixed in backend/OpenAPI/generator inputs first, then regenerated.
5. `openchat-admin` must consume the composed admin SDK instead of raw `/admin/im/v3/*` fetch logic.
