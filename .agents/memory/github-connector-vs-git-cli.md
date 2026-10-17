---
name: GitHub connector vs Git CLI
description: Distinguishes Replit's GitHub connector authorization from terminal Git credentials.
---

The Replit GitHub connector can be healthy and have repository write permission while `git push` over HTTPS still uses a separate stale or invalid terminal credential.

**Why:** Connector OAuth is injected through Replit's API proxy and does not automatically replace the credential used by the Git CLI remote.

**How to apply:** When HTTPS push authentication fails but connector access is healthy, use the connector's GitHub API for an immediate non-force update with optimistic branch checks. Do not assume this repairs future terminal or Git-pane pushes.

The dedicated GitHub source-control connection may report healthy while Git HTTPS rejects authentication and `gh` has no login. Its setup response may provide no API-proxy instructions, and generic integration reconnect cards may reject this special connection.

**Why:** A healthy source-control integration status did not imply usable terminal credentials, and the generic connect/reconnect flow could not repair it.

**How to apply:** If no documented API path is available, report the push as blocked rather than claiming success. Official Replit documentation directs reconnecting under account settings → Git Providers; reconnecting Connected Services alone does not repair Git-pane/import authentication.