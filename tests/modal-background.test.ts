import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";

test("authenticated white surfaces retain an opaque valid theme color", () => {
  const css = postcss.parse(readFileSync("client/src/index.css", "utf8"));
  const backgrounds: string[] = [];
  css.walkRules(".sika-page .bg-white", rule => {
    rule.walkDecls("background-color", declaration => backgrounds.push(declaration.value));
  });
  // Theme tokens contain complete colors, not bare HSL channels.
  assert.deepEqual(backgrounds, ["var(--card)"]);
  const cardColors: string[] = [];
  css.walkDecls("--card", declaration => cardColors.push(declaration.value));
  assert.equal(cardColors.length, 2);
  for (const color of cardColors) {
    assert.match(color, /^hsl\([\d.]+\s+[\d.]+%\s+[\d.]+%\)$/);
  }
});
