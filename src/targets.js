const fs = require("fs");

const RESERVED_HANDLES = new Set(["home", "explore", "search", "i", "intent", "settings"]);

function extractTargetsFromHtml(html) {
  const pairs = [...html.matchAll(/"([^"]+)":\s*"(https:\/\/x\.com\/[^"]+)"/g)].map((match) => ({
    name: match[1].trim(),
    sourceUrl: match[2].trim(),
    query: match[1].trim(),
  }));

  const seen = new Set();
  return pairs.filter((item) => {
    const key = `${item.name}::${item.sourceUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function loadTargetsFromFile(filePath) {
  return extractTargetsFromHtml(fs.readFileSync(filePath, "utf8"));
}

function extractHandle(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    if (url.pathname.startsWith("/search")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const handle = parts[0];
    if (!handle) return null;
    if (RESERVED_HANDLES.has(handle.toLowerCase())) return null;
    return handle;
  } catch {
    return null;
  }
}

function buildSubscriptionUrl(target, overrides = {}) {
  const override = overrides[target.name];
  if (override && typeof override === "string" && override.trim()) {
    return `rsshub://twitter/user/${override.trim().replace(/^@/, "")}`;
  }

  const handle = extractHandle(target.sourceUrl);
  if (handle) {
    return `rsshub://twitter/user/${handle}`;
  }

  return target.sourceUrl;
}

module.exports = {
  buildSubscriptionUrl,
  extractHandle,
  extractTargetsFromHtml,
  loadTargetsFromFile,
};

