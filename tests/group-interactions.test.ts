import { test } from "node:test";
import assert from "node:assert/strict";
import { GROUP_REACTIONS, isGroupReaction } from "../shared/group-reactions";
import { replySwipe } from "../client/src/lib/swipe-reply";

test("Group reactions match the requested seven choices only", () => {
  assert.deepEqual(GROUP_REACTIONS, ["❤️","🎉","✅","💰","😍","🤕","🔥"]);
  for(const emoji of GROUP_REACTIONS) assert.equal(isGroupReaction(emoji),true);
  for(const emoji of ["👍","😂","🙏","😮","😢",null,""]) assert.equal(isGroupReaction(emoji),false);
});

test("A deliberate right swipe triggers reply only beyond the threshold", () => {
  assert.equal(replySwipe("pending",4,2).axis,"pending");
  assert.equal(replySwipe("pending",30,3).ready,false);
  assert.equal(replySwipe("pending",100,5).ready,true);
  assert.equal(replySwipe("horizontal",1000,5).offset,88);
  assert.equal(replySwipe("horizontal",35,4).ready,false);
  assert.equal(replySwipe("horizontal",-10,0).offset,0);
});

test("Scrolling, leftward dragging and diagonals do not trigger a reply", () => {
  for(const [dx,dy] of [[1,80],[-120,0],[90,85],[100,150]]){
    assert.equal(replySwipe("pending",dx,dy).axis,"ignored");
    assert.equal(replySwipe("pending",dx,dy).ready,false);
  }
  assert.equal(replySwipe("ignored",120,5).ready,false);
  assert.equal(replySwipe("horizontal",20,80).axis,"ignored");
});
