import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lightMaskDmText } from "@/lib/moderation/light-mask";

describe("lightMaskDmText", () => {
  it("masks email addresses", () => {
    assert.equal(lightMaskDmText("email me at kid.lover@example.com ok"), "email me at [email hidden] ok");
  });

  it("masks phone numbers", () => {
    assert.equal(lightMaskDmText("call +94 77 123 4567 now"), "call [phone hidden] now");
    assert.equal(lightMaskDmText("or (555) 123-4567"), "or [phone hidden]");
  });

  it("masks URLs", () => {
    assert.equal(lightMaskDmText("see https://evil.example/path?x=1"), "see [link hidden]");
    assert.equal(lightMaskDmText("visit www.example.org today"), "visit [link hidden] today");
    assert.equal(lightMaskDmText("go to snapchat.com/add/me"), "go to [link hidden]");
  });

  it("masks @handles", () => {
    assert.equal(lightMaskDmText("add me @secret_acc"), "add me [handle hidden]");
  });

  it("masks lexicon words to first letter", () => {
    assert.equal(lightMaskDmText("send nudes please"), "send n**** please");
    assert.equal(lightMaskDmText("You look SEXY"), "You look S***");
  });

  it("leaves ordinary text unchanged", () => {
    const text = "Hey, great game today! See you at practice on Monday.";
    assert.equal(lightMaskDmText(text), text);
  });
});
