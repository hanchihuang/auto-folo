const { buildSubscriptionUrl } = require("./targets");

const API_URL = "https://api.folo.is/subscriptions";

function classifySubscriptionError(responseStatus, responseBody, fallbackMessage) {
  const message = fallbackMessage || "";
  if (responseStatus === 402 && /MAX_RSSHUB_SUBSCRIPTIONS/i.test(message)) {
    return "quota-exceeded";
  }
  if (/did not resolve a feed/i.test(message)) {
    return "unresolved-handle";
  }
  return "error";
}

async function createSubscription(target, options) {
  const subscriptionUrl = buildSubscriptionUrl(target, options.handleOverrides);
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://app.folo.is",
      referer: "https://app.folo.is/",
      cookie: options.cookieString,
    },
    body: JSON.stringify({ url: subscriptionUrl }),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {}

  if (!response.ok) {
    const message = `Subscription API failed (${response.status}): ${text.slice(0, 400)}`;
    const error = new Error(message);
    error.kind = classifySubscriptionError(response.status, payload, message);
    error.responseStatus = response.status;
    error.responseText = text;
    throw error;
  }

  if (payload?.code !== 0) {
    const message = `Subscription API returned code=${payload?.code ?? "unknown"}: ${text.slice(0, 400)}`;
    const error = new Error(message);
    error.kind = classifySubscriptionError(response.status, payload, message);
    error.responseStatus = response.status;
    error.responseText = text;
    throw error;
  }

  if (!payload?.feed?.id) {
    const message = `Subscription API did not resolve a feed for ${target.name}. Input URL: ${subscriptionUrl}`;
    const error = new Error(message);
    error.kind = "unresolved-handle";
    error.responseStatus = response.status;
    error.responseText = text;
    throw error;
  }

  return {
    subscriptionUrl,
    feedId: payload.feed.id,
    feedTitle: payload.feed.title,
    siteUrl: payload.feed.siteUrl,
    raw: payload,
  };
}

module.exports = {
  classifySubscriptionError,
  createSubscription,
};

