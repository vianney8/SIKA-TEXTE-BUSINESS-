---
name: Development server restart verification
description: A successful restart can coexist with obsolete development servers sharing the same port.
---

A successful workflow restart does not prove that every preview request reaches the latest application process: obsolete development servers have remained alive and shared the same listening port.

**Why:** A newly added API route returned the old application's HTML instead of JSON until obsolete server processes were stopped, despite the current workflow running successfully.

**How to apply:** If responses contradict the current code after a restart, inspect the active application processes and identify obsolete instances before changing route logic. Preserve the current managed workflow and stop only confirmed obsolete instances.
