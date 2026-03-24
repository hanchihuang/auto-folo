const { writeJson } = require("./fs-utils");

function summarizeState(state) {
  const summary = {
    total: 0,
    byStatus: {},
    unresolvedHandles: [],
    quotaBlocked: [],
  };

  for (const entry of Object.values(state.done)) {
    summary.total += 1;
    summary.byStatus[entry.status] = (summary.byStatus[entry.status] || 0) + 1;
    if (entry.status === "unresolved-handle") {
      summary.unresolvedHandles.push({ name: entry.name, sourceUrl: entry.sourceUrl });
    }
    if (entry.status === "quota-exceeded") {
      summary.quotaBlocked.push({ name: entry.name, sourceUrl: entry.sourceUrl });
    }
  }

  return summary;
}

function buildUnresolvedHandleList(state, handleOverrides = {}) {
  return Object.values(state.done)
    .filter((item) => item.status === "unresolved-handle")
    .map((item) => ({
      name: item.name,
      sourceUrl: item.sourceUrl,
      suggestedOverride: handleOverrides[item.name] || "",
    }));
}

function writeReports(paths, results, state, handleOverrides) {
  const summary = summarizeState(state);
  writeJson(paths.resultPath, results);
  writeJson(paths.unresolvedPath, buildUnresolvedHandleList(state, handleOverrides));
  writeJson(paths.summaryPath, summary);
  return summary;
}

module.exports = {
  buildUnresolvedHandleList,
  summarizeState,
  writeReports,
};

