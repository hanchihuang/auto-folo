const fs = require("fs");
const path = require("path");

function parseDotEnv(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  return parseDotEnv(fs.readFileSync(envPath, "utf8"));
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const name = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[name] = true;
      continue;
    }
    args[name] = next;
    i += 1;
  }
  return args;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveProjectPaths(projectRoot, overrides = {}) {
  const outputDir = overrides.outputDir || path.join(projectRoot, "output");
  const artifactsDir = path.join(outputDir, "artifacts");
  return {
    projectRoot,
    envPath: overrides.envPath || path.join(projectRoot, ".env"),
    outputDir,
    artifactsDir,
    statePath: path.join(outputDir, "run-state.json"),
    resultPath: path.join(artifactsDir, "run-result.json"),
    unresolvedPath: path.join(artifactsDir, "unresolved-handles.json"),
    summaryPath: path.join(artifactsDir, "summary.json"),
    handleOverridesPath: overrides.handleOverridesPath || path.join(projectRoot, "handle_overrides.json"),
  };
}

function buildConfig(command, argv, projectRoot) {
  const paths = resolveProjectPaths(projectRoot);
  const fileEnv = loadEnvFile(paths.envPath);
  const args = parseArgs(argv);
  const env = { ...fileEnv, ...process.env };

  return {
    command,
    args,
    paths,
    inputHtml: args.input || env.INPUT_HTML || "",
    cookieString: args.cookie || env.FOLO_COOKIE_STRING || "",
    targetName: args["target-name"] || env.TARGET_NAME || "",
    limit: toNumber(args.limit || env.LIMIT, null),
    forceRecheck: toBoolean(args["force-recheck"] ?? env.FORCE_RECHECK, false),
    stopOnQuota: toBoolean(args["stop-on-quota"] ?? env.STOP_ON_QUOTA, true),
  };
}

module.exports = {
  buildConfig,
  parseArgs,
  parseDotEnv,
  resolveProjectPaths,
  toBoolean,
  toNumber,
};

