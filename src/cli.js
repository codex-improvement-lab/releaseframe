#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { renderManifest, version } from "./index.js";

const help = `Releaseframe — one local comparison card from two screenshots.

  releaseframe render manifest.json --out ./release-card --json
  releaseframe demo --out ./authored-demo

The unused output directory receives card.png, alt.txt, post.txt and
review.json. Releaseframe reads only the manifest and its listed PNG paths.
It never uploads, posts or infers the declared values from screenshots.
Review the image and text before sharing; they may contain private material.
`;

let json = process.argv.includes("--json");
try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    help: { type: "boolean", short: "h" }, version: { type: "boolean" },
    out: { type: "string", short: "o" }, json: { type: "boolean", default: false },
  } });
  json = values.json;
  if (values.version) process.stdout.write(`${version}\n`);
  else if (values.help || positionals[0] === "help" || positionals.length === 0) process.stdout.write(help);
  else {
    if (!values.out) throw new Error("--out must name an unused output directory");
    let manifestPath;
    if (positionals[0] === "render" && positionals.length === 2) manifestPath = positionals[1];
    else if (positionals[0] === "demo" && positionals.length === 1) {
      manifestPath = fileURLToPath(new URL("../examples/demo.json", import.meta.url));
    } else throw new Error("Use render <manifest.json> or demo");
    const result = await renderManifest({ manifestPath, outputDir: values.out });
    if (json) process.stdout.write(JSON.stringify(result) + "\n");
    else process.stdout.write(`Rendered: ${result.output}\nReview card.png, alt.txt and post.txt before sharing.\n`);
  }
} catch (error) {
  if (json) process.stdout.write(JSON.stringify({ status: "error", message: error.message }) + "\n");
  else process.stderr.write(`Releaseframe: ${error.message}\n`);
  process.exitCode = 2;
}
