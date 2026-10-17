---
name: Imported media storage access
description: Verify managed storage access before activating replacement media in an imported project.
---

A configured storage directory is not proof that the current workspace can use its bucket. Verify the uploaded object is accessible before replacing the public media setting.

Replit App Storage is tied to Replit's runtime and is not directly accessible from an external Render deployment. Media needed on Render must be included in its deployed files or served from storage that Render can reach.

**Why:** In this imported project, signed uploads failed despite an existing storage directory. Creating an App Storage bucket restored default SDK access, but did not update the imported directory configuration. The new video storage was connected separately to avoid changing the location of unrelated media.

**How to apply:** When provisioning storage for an imported project, verify both access to the new bucket and the application's configured media location. Keep unrelated media locations unchanged unless a migration is requested. For Render, bundle public assets or configure reachable external storage rather than relying on Replit App Storage. Preserve the previous media setting until the new object is accessible, and do not hide a failed custom-video load by silently showing the bundled old video.
