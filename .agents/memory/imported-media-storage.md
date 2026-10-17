---
name: Imported media storage access
description: Verify managed storage access before activating replacement media in an imported project.
---

A configured storage directory is not proof that the current workspace can use its bucket. Verify the uploaded object is accessible before replacing the public media setting.

**Why:** In this imported project, signed uploads returned an authorization error even though storage configuration existed; both the Google client and the default Replit SDK also failed to access storage. Upload UI changes alone cannot repair that authorization.

**How to apply:** If storage access fails, preserve the previous media setting and report the storage blocker. Restore bucket access before claiming that a replacement video has been installed; do not hide a failed custom-video load by silently showing the bundled old video.
