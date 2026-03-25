# SDKWork IM Admin SDK Scripts

This directory contains workspace-level orchestration scripts for:

- OpenAPI source preparation
- TypeScript admin SDK generation
- generation boundary verification
- admin SDK assembly metadata

The root `generate-sdk` wrappers refresh from `/admin/im/v3/openapi.json` by default and protect manual-owned paths from generator drift.
