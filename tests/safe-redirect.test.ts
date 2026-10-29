import { test } from "node:test";
import assert from "node:assert/strict";
import { safeReturnPath } from "../shared/safe-redirect";

test("login redirects only to local application paths", () => {
  for (const input of [undefined, null, "", "//evil.example", "/\\evil.example", "/\t/evil.example",
    "https://evil.example", "javascript:alert(1)", "/\n/evil.example", "\\\\evil.example"]) {
    assert.equal(safeReturnPath(input), "/", String(input));
  }
  assert.equal(safeReturnPath("/groupeOfcl?group=official#recent"), "/groupeOfcl?group=official#recent");
  assert.equal(safeReturnPath("/withdrawal"), "/withdrawal");
});
