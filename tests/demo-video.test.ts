import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  BUNDLED_DEMO_VIDEO_URL,
  LEGACY_DEMO_VIDEO_URL,
  resolveDemoVideoSource,
} from "../shared/demo-video";

test("the imported unavailable video uses the selected bundled replacement", () => {
  assert.equal(resolveDemoVideoSource(LEGACY_DEMO_VIDEO_URL), BUNDLED_DEMO_VIDEO_URL);
  assert.equal(resolveDemoVideoSource("/promo.mp4"), BUNDLED_DEMO_VIDEO_URL);
  assert.equal(resolveDemoVideoSource(undefined), BUNDLED_DEMO_VIDEO_URL);
  assert.equal(resolveDemoVideoSource(""), BUNDLED_DEMO_VIDEO_URL);
});

test("other administrator-selected videos are never silently replaced", () => {
  for (const source of [
    "/api/media/demo-video/new-admin-video.mp4",
    "https://media.example.com/replacement.mp4",
    "/uploads/replacement.mp4",
    BUNDLED_DEMO_VIDEO_URL,
  ]) {
    assert.equal(resolveDemoVideoSource(source), source);
  }
});

test("the public video version matches the bundled file", () => {
  const video = readFileSync(new URL("../client/public/promo.mp4", import.meta.url));
  const version = createHash("sha256").update(video).digest("hex").slice(0, 12);
  assert.equal(BUNDLED_DEMO_VIDEO_URL, `/promo.mp4?v=${version}`);
});
