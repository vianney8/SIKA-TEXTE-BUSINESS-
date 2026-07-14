---
name: Express route registration timing
description: Why middleware factories like multer().single() must be declared before any app.post() that uses them, in this codebase's single-function route registration style.
---

In `server/routes.ts`, all routes are registered synchronously inside one `registerRoutes(app)` function. When you write:

```js
app.post('/x', requireAuth, multerManual.single('screenshot'), handler);
```

`multerManual.single('screenshot')` is **evaluated immediately**, at registration time, to produce the middleware function — not deferred until a request comes in. If `multerManual` is declared with `const` further down in the same file, this throws `ReferenceError: Cannot access 'multerManual' before initialization` (TDZ) as soon as the server boots, not on first request.

**Why:** it's easy to assume route handler bodies and their middleware args are both "called later," but only the handler body (the async function) is deferred — arguments passed directly to `app.post(...)` run inline during setup.

**How to apply:** declare any shared middleware factory (multer instances, etc.) once near the top of `registerRoutes`, before the first route that references it, rather than next to the route that historically used it first.
