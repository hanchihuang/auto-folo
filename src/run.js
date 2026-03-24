const fs = require("fs");
const { ensureDir, readJson } = require("./fs-utils");
const { createSubscription } = require("./folo-api");
const { writeReports } = require("./report");
const { loadRunState, saveRunState } = require("./state");
const { loadTargetsFromFile } = require("./targets");

function loadHandleOverrides(filePath) {
  return readJson(filePath, {});
}

function validateConfig(config) {
  if (!config.inputHtml) {
    throw new Error("Missing input HTML. Provide --input or set INPUT_HTML in .env.");
  }
  if (!fs.existsSync(config.inputHtml)) {
    throw new Error(`Input HTML not found: ${config.inputHtml}`);
  }
  if (!config.cookieString) {
    throw new Error("Missing FOLO_COOKIE_STRING. Set it in .env or pass --cookie.");
  }
}

function makeSuccessResult(target, subscription) {
  return {
    name: target.name,
    sourceUrl: target.sourceUrl,
    query: target.query,
    subscriptionUrl: subscription.subscriptionUrl,
    status: "subscribed",
    feedId: subscription.feedId,
    feedTitle: subscription.feedTitle,
    siteUrl: subscription.siteUrl,
  };
}

function makeErrorResult(target, error) {
  return {
    name: target.name,
    sourceUrl: target.sourceUrl,
    query: target.query,
    status: error.kind || "error",
    error: error.message,
  };
}

async function runBatch(config) {
  validateConfig(config);
  ensureDir(config.paths.outputDir);
  ensureDir(config.paths.artifactsDir);

  const targets = loadTargetsFromFile(config.inputHtml).filter((target) => {
    if (!config.targetName) return true;
    return target.name.trim().toLowerCase() === config.targetName.trim().toLowerCase();
  });

  const handleOverrides = loadHandleOverrides(config.paths.handleOverridesPath);
  const state = loadRunState(config.paths.statePath);
  const results = [];

  let processed = 0;
  for (const target of targets) {
    const prior = state.done[target.name];
    const successStatuses = new Set(["subscribed", "already-followed"]);
    if (!config.forceRecheck && prior && successStatuses.has(prior.status)) {
      results.push({ ...prior, skipped: true });
      continue;
    }

    if (config.limit && processed >= config.limit) break;

    try {
      const subscription = await createSubscription(target, {
        cookieString: config.cookieString,
        handleOverrides,
      });
      const result = makeSuccessResult(target, subscription);
      state.done[target.name] = result;
      results.push(result);
      saveRunState(config.paths.statePath, state);
      processed += 1;
      console.log(`SUBSCRIBED: ${target.name} -> ${subscription.subscriptionUrl}`);
    } catch (error) {
      const result = makeErrorResult(target, error);
      state.done[target.name] = result;
      results.push(result);
      saveRunState(config.paths.statePath, state);
      processed += 1;
      console.error(`ERROR: ${target.name} -> ${error.message}`);
      if (result.status === "quota-exceeded" && config.stopOnQuota) {
        break;
      }
    }
  }

  return {
    results,
    state,
    handleOverrides,
    summary: writeReports(config.paths, results, state, handleOverrides),
  };
}

module.exports = {
  runBatch,
};

