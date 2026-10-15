---
name: Protected npm registry
description: Distinguish package security blocks from incorrect protected-registry URL rewriting.
---

Do not force npm's `replace-registry-host=always` in this environment. Use the environment registry and npm's default npmjs-only rewriting.

**Why:** The imported npm configuration caused already-proxied tarball URLs to be rewritten with `/npm/npm/`, resulting in 404s even when the same package was available through the protected registry at `/npm/`. An actual security-policy denial also occurred for Express 4; not every install failure had the same cause.

**How to apply:** For download 404s, compare the failing URL with the registry's package metadata before changing versions. Keep the protected registry in use; never bypass security blocks.
