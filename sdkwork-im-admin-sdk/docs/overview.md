# SDKWork IM Admin SDK Overview

`sdkwork-im-admin-sdk` is the admin control-plane sibling to `sdkwork-im-sdk`.

- authority contract: `/admin/im/v3/openapi.json`
- admin docs: `/admin/im/v3/docs`
- app auth bridge: `/im/v3/auth/*` through generated app SDKs

The workspace exists so admin consoles and control-plane tools do not fall back to handwritten `/admin/im/v3/*` HTTP clients.
