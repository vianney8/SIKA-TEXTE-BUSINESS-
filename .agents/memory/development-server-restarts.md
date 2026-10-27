---
name: Development server restart verification
description: A successful restart can coexist with obsolete development servers sharing the same port.
---

A successful workflow restart does not prove that every preview request reaches the latest application process: obsolete development servers have remained alive and shared the same listening port.

**Why:** A newly added API route returned the old application's HTML instead of JSON until obsolete server processes were stopped, despite the current workflow running successfully.

**How to apply:** If responses contradict the current code after a restart, inspect the active application processes and identify obsolete instances before changing route logic. Preserve the current managed workflow and stop only confirmed obsolete instances.

Vite instances sharing the port and dependency-cache directory can also produce an apparent duplicate-React/“Invalid hook call” error. Removing obsolete listeners alone may leave the remaining instance's in-memory optimized dependencies inconsistent with disk.

**Why:** Multiple live development servers served incompatible dependency hashes; restarting the remaining managed server only after removing obsolete processes restored the login page.

**How to apply:** Check listeners with `lsof` and correlate their process groups with the managed workflow. After stopping confirmed obsolete instances, restart the current workflow, verify there is only one listener, and then verify the preview. Do not repeatedly adjust React application hooks to compensate for inconsistent development caches.
