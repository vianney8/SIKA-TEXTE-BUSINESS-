---
name: Preview cookie policy
description: How the development proxy affects observed session cookie attributes.
---

Do not conclude that the app emits `SameSite=None` from a browser-cookie inspection in Replit preview alone. Compare the originating Express response with the proxied response.

**Why:** direct, successful login requests against this project's Express server emitted `SameSite=Lax; HttpOnly; Secure`, while the same request through the Replit development domain emitted `SameSite=None; HttpOnly; Secure`. The development proxy rewrites this attribute.

**How to apply:** verify origin policy separately, retain explicit anti-CSRF protection for discussion mutations, and check cookies again on the actual Render deployment. Do not weaken application-side protection merely to make a preview-only cookie assertion pass. Never log cookie values during these checks.
