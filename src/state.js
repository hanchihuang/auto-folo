const { readJson, writeJson } = require("./fs-utils");

function loadRunState(statePath) {
  return readJson(statePath, { done: {} });
}

function saveRunState(statePath, state) {
  writeJson(statePath, state);
}

module.exports = {
  loadRunState,
  saveRunState,
};

