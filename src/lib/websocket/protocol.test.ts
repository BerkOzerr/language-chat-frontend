import { describe, expect, it } from "vitest";
import { isServerFrame } from "./protocol";

describe("isServerFrame", () => {
  it("accepts a valid chat message frame", () => {
    expect(isServerFrame({
      type: "new_message",
      message: {
        id: "m1", room_id: "r1", user_id: "u1", username: "learner",
        content: "Hello!", created_at: "2026-10-18T12:00:00.000Z"
      }
    })).toBe(true);
  });

  it("rejects unknown event types and malformed message payloads", () => {
    expect(isServerFrame({ type: "execute_script", payload: "alert(1)" })).toBe(false);
    expect(isServerFrame({ type: "new_message", message: { content: "hello" } })).toBe(false);
    expect(isServerFrame(null)).toBe(false);
  });

  it("rejects messages larger than the UI limit", () => {
    expect(isServerFrame({
      type: "new_message",
      message: {
        id: "m1", room_id: "r1", user_id: "u1", username: "learner",
        content: "x".repeat(2001), created_at: "2026-10-18T12:00:00.000Z"
      }
    })).toBe(false);
  });
});
