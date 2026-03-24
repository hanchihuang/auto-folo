const { buildSubscriptionUrl } = require("./targets");
const { classifySubscriptionError } = require("./folo-api");

const DISCOVER_URL = "https://app.folo.is/discover";

function parseCookieString(cookieString) {
  return cookieString
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eqIndex = part.indexOf("=");
      if (eqIndex === -1) return null;
      const name = part.slice(0, eqIndex).trim();
      const value = part.slice(eqIndex + 1).trim();
      if (!name) return null;
      return {
        name,
        value,
        domain: ".folo.is",
        path: "/",
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      };
    })
    .filter(Boolean);
}

function makeBrowserError(message, kind = "error", status = null, body = "") {
  const error = new Error(message);
  error.kind = kind;
  error.responseStatus = status;
  error.responseText = body;
  return error;
}

async function createBrowserSession(config) {
  const { chromium } = require("playwright");
  const context = await chromium.launchPersistentContext(config.paths.browserProfileDir, {
    headless: config.headless,
    viewport: { width: 1440, height: 960 },
  });
  await context.addCookies(parseCookieString(config.cookieString));
  const page = context.pages()[0] || await context.newPage();
  await page.goto(DISCOVER_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  return { context, page };
}

async function fillSearchForm(page, value) {
  const input = page.locator("input[name='keyword']").first();
  const button = page.locator("button[data-testid='discover-form-submit']").first();
  await input.fill("");
  await input.fill(value);
  await page.waitForFunction(() => {
    const buttonEl = document.querySelector("button[data-testid='discover-form-submit']");
    return !!buttonEl && !buttonEl.disabled;
  });
  await button.click();
}

async function clickDialogFollow(page) {
  const dialog = page.locator("[role='dialog']").last();
  if (!(await dialog.isVisible({ timeout: 2000 }).catch(() => false))) return false;
  const button = dialog.locator("button").filter({ hasText: /^Follow$/i }).last();
  if (!(await button.isVisible({ timeout: 1500 }).catch(() => false))) return false;
  await button.click();
  return true;
}

async function clickFirstResultFollow(page) {
  const cards = page.locator("div.relative.m-4");
  const count = await cards.count().catch(() => 0);
  for (let i = 0; i < count; i += 1) {
    const card = cards.nth(i);
    const followed = card.locator("button").filter({ hasText: /^Followed$/i }).last();
    if (await followed.isVisible({ timeout: 300 }).catch(() => false)) {
      return "already-followed";
    }
    const follow = card.locator("button").filter({ hasText: /^Follow$/i }).last();
    if (await follow.isVisible({ timeout: 300 }).catch(() => false)) {
      await follow.click();
      return "clicked";
    }
  }
  return "missing";
}

async function waitForSubscriptionResponse(page, action) {
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("api.folo.is/subscriptions") && response.request().method() === "POST",
    { timeout: 15000 },
  );
  await action();
  const response = await responsePromise;
  const text = await response.text().catch(() => "");
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {}
  return { response, text, payload };
}

function convertSubscriptionResponse(target, subscriptionUrl, response, text, payload) {
  if (!response.ok()) {
    const kind = classifySubscriptionError(response.status(), payload, text);
    throw makeBrowserError(
      `Browser subscription failed (${response.status()}): ${text.slice(0, 400)}`,
      kind,
      response.status(),
      text,
    );
  }
  if (payload?.code !== 0) {
    const kind = classifySubscriptionError(response.status(), payload, text);
    throw makeBrowserError(
      `Browser subscription returned code=${payload?.code ?? "unknown"}: ${text.slice(0, 400)}`,
      kind,
      response.status(),
      text,
    );
  }
  if (!payload?.feed?.id) {
    throw makeBrowserError(
      `Browser subscription did not resolve a feed for ${target.name}. Input URL: ${subscriptionUrl}`,
      "unresolved-handle",
      response.status(),
      text,
    );
  }
  return {
    subscriptionUrl,
    feedId: payload.feed.id,
    feedTitle: payload.feed.title,
    siteUrl: payload.feed.siteUrl,
    raw: payload,
  };
}

async function createSubscriptionInBrowser(target, options) {
  const subscriptionUrl = buildSubscriptionUrl(target, options.handleOverrides);
  if (/\/search\?/i.test(subscriptionUrl)) {
    throw makeBrowserError(
      `Browser mode could not resolve a feed for ${target.name}. Input URL: ${subscriptionUrl}`,
      "unresolved-handle",
    );
  }

  const { page } = options;
  await page.goto(DISCOVER_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await fillSearchForm(page, subscriptionUrl);
  await page.waitForTimeout(1200);

  if (await page.locator("[role='dialog']").last().isVisible({ timeout: 1200 }).catch(() => false)) {
    const result = await waitForSubscriptionResponse(page, async () => {
      const clicked = await clickDialogFollow(page);
      if (!clicked) {
        throw makeBrowserError(`Browser mode found a dialog for ${target.name}, but no orange Follow button was clickable.`);
      }
    });
    return convertSubscriptionResponse(target, subscriptionUrl, result.response, result.text, result.payload);
  }

  const rowAction = await clickFirstResultFollow(page);
  if (rowAction === "already-followed") {
    return {
      subscriptionUrl,
      feedId: null,
      feedTitle: target.name,
      siteUrl: target.sourceUrl,
      raw: null,
      alreadyFollowed: true,
    };
  }
  if (rowAction === "missing") {
    throw makeBrowserError(`Browser mode could not find a Follow button for ${target.name}.`);
  }

  const result = await waitForSubscriptionResponse(page, async () => {
    const clicked = await clickDialogFollow(page);
    if (!clicked) {
      throw makeBrowserError(`Browser mode clicked the first result for ${target.name}, but the confirm Follow button did not appear.`);
    }
  });
  return convertSubscriptionResponse(target, subscriptionUrl, result.response, result.text, result.payload);
}

module.exports = {
  createBrowserSession,
  createSubscriptionInBrowser,
};
