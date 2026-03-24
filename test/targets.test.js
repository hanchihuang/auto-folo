const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSubscriptionUrl,
  extractHandle,
  extractTargetsFromHtml,
} = require("../src/targets");

test("extractTargetsFromHtml parses unique name/url pairs", () => {
  const html = `
    <script>
      const x = {
        "Sam Altman": "https://x.com/sama",
        "Sam Altman": "https://x.com/sama",
        "Yann LeCun": "https://x.com/ylecun"
      }
    </script>
  `;

  const targets = extractTargetsFromHtml(html);
  assert.equal(targets.length, 2);
  assert.equal(targets[0].name, "Sam Altman");
  assert.equal(targets[1].name, "Yann LeCun");
});

test("extractHandle returns a handle for direct x.com profile URLs", () => {
  assert.equal(extractHandle("https://x.com/sama"), "sama");
  assert.equal(extractHandle("https://x.com/ylecun/"), "ylecun");
});

test("extractHandle rejects search pages and reserved paths", () => {
  assert.equal(extractHandle("https://x.com/search?q=Sam"), null);
  assert.equal(extractHandle("https://x.com/home"), null);
});

test("buildSubscriptionUrl prefers overrides before inferred handles", () => {
  const target = { name: "Abhimanyu Dubey", sourceUrl: "https://x.com/search?q=Abhimanyu" };
  const url = buildSubscriptionUrl(target, { "Abhimanyu Dubey": "@real_handle" });
  assert.equal(url, "rsshub://twitter/user/real_handle");
});

test("buildSubscriptionUrl converts direct handles to rsshub routes", () => {
  const target = { name: "Sam Altman", sourceUrl: "https://x.com/sama" };
  const url = buildSubscriptionUrl(target, {});
  assert.equal(url, "rsshub://twitter/user/sama");
});

