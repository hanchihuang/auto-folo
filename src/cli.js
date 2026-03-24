const path = require("path");
const { buildConfig } = require("./config");
const { readJson } = require("./fs-utils");
const { summarizeState } = require("./report");
const { runBatch } = require("./run");

function printUsage() {
  console.log(`auto-folo

Commands:
  auto-folo run [--input path] [--mode api|browser] [--target-name "Name"] [--limit 10] [--force-recheck]
  auto-folo report

Options:
  --input PATH           Path to the exported HTML file
  --cookie STRING        Folo cookie string. Prefer FOLO_COOKIE_STRING in .env
  --mode MODE            api or browser. Default: api
  --target-name NAME     Only process one person
  --limit N              Only process the first N matching items
  --force-recheck        Retry even if the target already succeeded before
  --stop-on-quota        Stop immediately when Folo quota is hit (default: true)
  --headless             Run browser mode headless
`);
}

async function runCli() {
  const projectRoot = path.resolve(__dirname, "..");
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  if (command === "run") {
    const config = buildConfig(command, argv.slice(1), projectRoot);
    const result = await runBatch(config);
    console.log("");
    console.log("Summary");
    console.log(JSON.stringify(result.summary, null, 2));
    return;
  }

  if (command === "report") {
    const config = buildConfig(command, argv.slice(1), projectRoot);
    const state = readJson(config.paths.statePath, { done: {} });
    console.log(JSON.stringify(summarizeState(state), null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

module.exports = {
  runCli,
};
