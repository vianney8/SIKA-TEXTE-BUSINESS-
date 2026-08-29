---
name: GitHub connector vs Git CLI
description: Distinguishes Replit's GitHub connector authorization from terminal Git credentials.
---

The Replit GitHub connector can be healthy and have repository write permission while `git push` over HTTPS still uses a separate stale or invalid terminal credential.

**Why:** Connector OAuth is injected through Replit's API proxy and does not automatically replace the credential used by the Git CLI remote.

**How to apply:** When HTTPS push authentication fails but connector access is healthy, use the connector's GitHub API for an immediate non-force update with optimistic branch checks. Do not assume this repairs future terminal or Git-pane pushes.