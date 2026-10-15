import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));

test("npm lockfile uses portable HTTPS registry tarball URLs", () => {
  let tarballs = 0;
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (!entry.resolved) continue;
    const url = new URL(entry.resolved);
    assert.equal(url.protocol, "https:", `${name}: non-HTTPS package source`);
    assert.equal(url.hostname, "registry.npmjs.org", `${name}: environment-specific package source`);
    assert.ok(!url.pathname.startsWith("/npm/"), `${name}: proxy prefix in public URL`);
    assert.ok(entry.integrity, `${name}: missing package integrity`);
    tarballs++;
  }
  assert.ok(tarballs > 0, "No package tarballs were checked");
});
