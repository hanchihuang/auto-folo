# auto-folo

Batch subscribe Folo feeds from a local HTML file that contains a list of names and `x.com` links.

This project is built for the exact workflow discussed here:

- parse `大模型专家名单提取.html`
- convert direct `x.com/<handle>` links into `rsshub://twitter/user/<handle>`
- call Folo's real subscription API
- optionally drive the Folo UI in browser mode
- persist state for resume
- export unresolved names that still need manual X handle mapping

It is packaged as a normal CLI project so another user can clone it and run it directly.

Chinese documentation:
[README.zh-CN.md](/home/user/图片/auto-folo/README.zh-CN.md)

## What This Tool Does

- Reads a local HTML file and extracts `"Name": "https://x.com/..."` pairs
- For direct X profile links, subscribes using the matching RSSHub route
- For `x.com/search?...` links, marks them as unresolved until you provide a real handle
- Saves progress after every item
- Stops immediately when the Folo account hits the RSSHub subscription quota
- Exports a clean unresolved-handle list for the remaining ambiguous names
- Supports both `api` mode and `browser` mode

## What This Tool Does Not Do

- It does **not** bypass Folo limits
- It does **not** guess hidden X handles reliably from search-page URLs
- It does **not** store your cookie in the repo

If your Folo account is on the free plan, hitting the RSSHub quota is a normal platform-side stop condition.

## Requirements

- Node.js 20 or newer
- A valid Folo cookie string from a logged-in browser session
- An input HTML file containing the name-to-`x.com` mapping

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/hanchihuang/auto-folo.git
cd auto-folo
```

### 2. Create your environment file

```bash
cp .env.example .env
```

Fill `.env`:

```env
FOLO_COOKIE_STRING=your_full_folo_cookie_here
INPUT_HTML=/absolute/path/to/大模型专家名单提取.html
FORCE_RECHECK=0
STOP_ON_QUOTA=1
```

### 3. Run the batch subscription

Linux / macOS:

```bash
./run.sh
```

Windows:

```bat
run.bat
```

Or:

```bash
npm run follow
```

Browser mode:

```bash
npm run follow:browser
```

Or with explicit CLI flags:

```bash
node ./bin/auto-folo.js run \
  --input "/absolute/path/to/大模型专家名单提取.html" \
  --force-recheck
```

### 4. View the run summary

```bash
npm run report
```

## Common Commands

Run the whole batch:

```bash
npm run follow
```

Run in browser mode:

```bash
npm run follow:browser
```

Run a single target:

```bash
node ./bin/auto-folo.js run --target-name "Sam Altman"
```

Run a single target in browser mode:

```bash
node ./bin/auto-folo.js run --mode browser --target-name "Sam Altman"
```

Retry everything from scratch:

```bash
node ./bin/auto-folo.js run --force-recheck
```

Only process the first 10 items:

```bash
node ./bin/auto-folo.js run --limit 10
```

Print the current state summary:

```bash
npm run report
```

Run tests:

```bash
npm test
```

## Project Files

```text
auto-folo/
  bin/auto-folo.js
  src/
  test/
  handle_overrides.json
  .env.example
  output/
```

Key runtime outputs:

- `output/run-state.json`
  Stores per-person status so the job can resume safely.
- `output/artifacts/run-result.json`
  Stores the results from the latest run.
- `output/artifacts/unresolved-handles.json`
  Stores names that still point to `x.com/search?...` and need a real handle.
- `output/artifacts/summary.json`
  Stores a machine-readable run summary.

Example files:

- [examples/input.sample.html](/home/user/图片/auto-folo/examples/input.sample.html)
- [examples/handle_overrides.example.json](/home/user/图片/auto-folo/examples/handle_overrides.example.json)

## Handling Unresolved Search Links

If your source HTML contains entries like:

```json
"Abhimanyu Dubey": "https://x.com/search?q=Abhimanyu%20Dubey&src=typed_query"
```

then Folo cannot resolve that directly into a feed. Add a manual override to `handle_overrides.json`:

```json
{
  "Abhimanyu Dubey": "real_x_handle"
}
```

Then rerun:

```bash
node ./bin/auto-folo.js run --target-name "Abhimanyu Dubey" --force-recheck
```

## Quota Behavior

This tool uses Folo's real subscription API. If the API returns a quota error such as:

```text
MAX_RSSHUB_SUBSCRIPTIONS exceeded
```

the default behavior is to stop immediately so the rest of the queue is not wasted.

You can change that:

```bash
node ./bin/auto-folo.js run --stop-on-quota false
```

But in practice, keeping `STOP_ON_QUOTA=1` is the correct default.

## Security Notes

- Never commit `.env`
- Never commit your Folo cookie string
- If you suspect the cookie leaked, invalidate it by logging out and logging back in

## How It Works

1. Parse the HTML source for `name -> x.com link`
2. Convert direct X handles to `rsshub://twitter/user/<handle>`
3. Call `https://api.folo.is/subscriptions`
4. Persist result state after each attempt
5. Export unresolved-handle tasks for manual cleanup

## Accuracy Notes

This tool is intentionally conservative:

- direct X handle URLs are treated as authoritative
- search-page URLs are not guessed automatically
- Folo quota errors are surfaced exactly as returned by the platform

That tradeoff is deliberate because correctness matters more than pretending to subscribe successfully.

## Browser Mode

Browser mode is for users who explicitly want real UI automation.

It will:

1. open Folo Discover
2. fill the form with the exact RSSHub route
3. click `Search`
4. click the visible `Follow`
5. click the orange confirmation `Follow`

Use it when you want strict button-click behavior. Keep using `api` mode when you want the most stable batch execution.

## License

MIT
