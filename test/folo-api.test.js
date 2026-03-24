const test = require("node:test");
const assert = require("node:assert/strict");

const { classifySubscriptionError } = require("../src/folo-api");

test("classifySubscriptionError marks RSSHub quota errors", () => {
  const kind = classifySubscriptionError(
    402,
    {},
    "Subscription API failed (402): MAX_RSSHUB_SUBSCRIPTIONS exceeded",
  );
  assert.equal(kind, "quota-exceeded");
});

test("classifySubscriptionError marks unresolved handles", () => {
  const kind = classifySubscriptionError(
    200,
    {},
    "Subscription API did not resolve a feed for Abhimanyu Dubey",
  );
  assert.equal(kind, "unresolved-handle");
});

test("classifySubscriptionError falls back to generic error", () => {
  const kind = classifySubscriptionError(500, {}, "internal error");
  assert.equal(kind, "error");
});

