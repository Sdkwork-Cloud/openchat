# Architecture

`sdkwork-im-admin-sdk` keeps one contract source and one consumer path:

`admin web / tooling -> @openchat/sdkwork-im-admin-sdk -> generated admin HTTP SDK -> /admin/im/v3`

The handwritten facade can also compose generated app-auth APIs for `/im/v3/auth/*`, but the admin schema remains isolated from the app SDK workspace.
