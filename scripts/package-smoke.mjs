import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tarball = process.argv.slice(2).filter(arg => arg !== "--")[0];
if (!tarball || !process.env.npm_execpath) throw new Error("Run pnpm smoke <tarball>");
const temp = await mkdtemp(path.join(tmpdir(), "releaseframe-package-"));
async function run(executable, args, cwd, expected = 0) {
  const logs = [], child = spawn(executable, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", chunk => logs.push(chunk)); child.stderr.on("data", chunk => logs.push(chunk));
  const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
  const output = Buffer.concat(logs).toString("utf8");
  assert.equal(code, expected, output);
  return output;
}
try {
  await writeFile(path.join(temp, "package.json"), '{"name":"releaseframe-clean-smoke","version":"0.0.0","private":true}\n');
  await run(process.execPath, [process.env.npm_execpath, "add", path.resolve(tarball), "--ignore-scripts"], temp);
  const require = createRequire(path.join(temp, "package.json"));
  const entry = require.resolve("@codex-improvement-lab/releaseframe");
  const installedRoot = await realpath(path.join(temp, "node_modules"));
  const relativeEntry = path.relative(installedRoot, await realpath(entry));
  assert.ok(relativeEntry && relativeEntry !== ".." && !relativeEntry.startsWith(`..${path.sep}`) && !path.isAbsolute(relativeEntry));
  const packageRoot = path.dirname(path.dirname(entry));
  const metadata = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  const cli = path.join(packageRoot, "src/cli.js");
  assert.equal((await run(process.execPath, [cli, "--version"], temp)).trim(), metadata.version);
  assert.equal((await run(process.execPath, [process.env.npm_execpath, "exec", "releaseframe", "--version"], temp)).trim(), metadata.version);
  const font = await readFile(path.join(packageRoot, "assets/fonts/Inter.ttf"));
  assert.equal(createHash("sha256").update(font).digest("hex"), "29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031");
  await readFile(path.join(packageRoot, "docs/demo.png"));
  const out = path.join(temp, "demo-card");
  const demo = JSON.parse(await run(process.execPath, [cli, "demo", "--out", out, "--json"], temp));
  assert.equal(demo.status, "rendered"); assert.equal(demo.version, metadata.version);
  assert.deepEqual(demo.panels.map(panel => panel.passes), [false, true]);
  const png = await readFile(path.join(out, "card.png"));
  assert.equal(png.readUInt32BE(16), 1120); assert.equal(png.readUInt32BE(20), 780);
  const review = JSON.parse(await readFile(path.join(out, "review.json"), "utf8"));
  assert.equal(review.declaredValuesNotMeasuredFromImages, true);
  await readFile(path.join(out, "alt.txt"), "utf8");
  await readFile(path.join(out, "post.txt"), "utf8");
  const refused = JSON.parse(await run(process.execPath, [cli, "demo", "--out", out, "--json"], temp, 2));
  assert.equal(refused.status, "error"); assert.match(refused.message, /EEXIST/);
  // Model a caller supplying a separate font, not an undeclared system fallback.
  const cjkBytes = await readFile(fileURLToPath(new URL("../test/fixtures/ReleaseframeTestCJK.otf", import.meta.url)));
  await writeFile(path.join(temp, "caller-font.otf"), cjkBytes);
  const chinese = JSON.parse(await readFile(path.join(packageRoot, "examples/demo-zh.json"), "utf8"));
  chinese.font = "caller-font.otf";
  for (const panel of chinese.panels) panel.image = path.join(packageRoot, "examples", panel.image);
  await writeFile(path.join(temp, "chinese.json"), JSON.stringify(chinese));
  const chineseOut = path.join(temp, "chinese-card");
  const renderedChinese = JSON.parse(await run(process.execPath, [cli, "render", path.join(temp, "chinese.json"), "--out", chineseOut, "--json"], temp));
  assert.equal(renderedChinese.status, "rendered");
  const chineseReview = JSON.parse(await readFile(path.join(chineseOut, "review.json"), "utf8"));
  assert.equal(chineseReview.font.sha256, createHash("sha256").update(cjkBytes).digest("hex"));
  console.log(JSON.stringify({ packedInstall: "passed", version: metadata.version,
    demo: demo.status, customFontChinese: renderedChinese.status, noOverwrite: true, bytes: png.length, sha256: review.imageSha256 }));
} finally {
  const actual = await realpath(temp), parent = await realpath(tmpdir());
  if (path.dirname(actual) === parent && path.basename(actual).startsWith("releaseframe-package-")) {
    await rm(actual, { recursive: true, force: true });
  }
}
