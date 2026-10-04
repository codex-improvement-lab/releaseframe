import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { renderManifest, validateManifest, version } from "../src/index.js";

const execute = promisify(execFile);
const root = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const sample = path.join(root, "examples/demo.json");
let temp;
before(async () => { temp = await mkdtemp(path.join(tmpdir(), "releaseframe-test-")); });
after(async () => {
  if (!temp) return;
  const actual = await realpath(temp), parent = await realpath(tmpdir());
  if (path.dirname(actual) === parent && path.basename(actual).startsWith("releaseframe-test-")) {
    await rm(actual, { recursive: true, force: true });
  }
});
const sha = async file => (await import("node:crypto")).createHash("sha256").update(await readFile(file)).digest("hex");
async function copiedManifest(change = () => {}) {
  const original = JSON.parse(await readFile(sample, "utf8"));
  for (const panel of original.panels) panel.image = path.join(root, "examples", panel.image);
  change(original);
  const name = `input-${Math.random().toString(36).slice(2)}.json`;
  const file = path.join(temp, name);
  await writeFile(file, JSON.stringify(original));
  return file;
}

test("authored complete loop renders a deterministic, reviewable local card without changing inputs", async () => {
  const inputHashes = await Promise.all(["demo-before.png", "demo-after.png"].map(name => sha(path.join(root, "examples", name))));
  const first = await renderManifest({ manifestPath: sample, outputDir: path.join(temp, "first") });
  assert.equal(first.status, "rendered"); assert.equal(first.version, version);
  assert.deepEqual(first.panels.map(panel => panel.passes), [false, true]);
  const png = await readFile(path.join(first.output, "card.png"));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), 1120); assert.equal(png.readUInt32BE(20), 780);
  const review = JSON.parse(await readFile(path.join(first.output, "review.json"), "utf8"));
  assert.equal(review.declaredValuesNotMeasuredFromImages, true);
  assert.equal(review.privacyReviewRequired, true);
  assert.deepEqual(review.panels.map(panel => panel.cropY), [200, 200]);
  assert.deepEqual(review.panels.map(panel => panel.imageSha256), inputHashes);
  const alt = await readFile(path.join(first.output, "alt.txt"), "utf8");
  assert.match(alt, /Authored mobile app drawing/); assert.match(alt, /not measured from the images/);
  const post = await readFile(path.join(first.output, "post.txt"), "utf8");
  assert.equal(post.trim().match(/https:\/\//g).length, 1);
  await assert.rejects(stat(path.join(first.output, "card.svg")), /ENOENT/);
  const second = await renderManifest({ manifestPath: sample, outputDir: path.join(temp, "second") });
  assert.equal(second.imageSha256, first.imageSha256);
  assert.deepEqual(await Promise.all(["demo-before.png", "demo-after.png"].map(name => sha(path.join(root, "examples", name)))), inputHashes);
});

test("metric direction and tolerance are applied to declared values, not inferred from screenshots", async () => {
  const manifest = await copiedManifest(input => {
    input.metric = { label: "Completed checks", unit: "rows", baseline: 3, tolerance: 0, mode: "at-least" };
    input.panels[0].value = 2; input.panels[1].value = 3;
  });
  const result = await renderManifest({ manifestPath: manifest, outputDir: path.join(temp, "at-least") });
  assert.deepEqual(result.panels.map(panel => panel.passes), [false, true]);
});

test("invalid or ambiguous inputs fail before an output directory is created", async () => {
  const otherImage = path.join(temp, "different-size.png");
  await writeFile(otherImage, new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250"><rect width="250" height="250" fill="white"/></svg>').render().asPng());
  for (const [label, edit, error] of [
    ["different-dimensions", input => { input.panels[1].image = otherImage; input.panels[1].cropY = 0; }, /same dimensions/],
    ["missing-image", input => { input.panels[0].image = path.join(temp, "absent.png"); }, /ENOENT/],
    ["invalid-crop", input => { input.panels[0].cropY = 8000; }, /cropY/],
    ["missing-source", input => { input.source.label = ""; }, /source.label/],
    ["bidi-override", input => { input.headline = "False\u202eclaim"; }, /control or bidi/],
    ["overlong-headline", input => { input.headline = "W".repeat(60); }, /headline/],
  ]) {
    const manifest = await copiedManifest(edit), out = path.join(temp, label);
    await assert.rejects(renderManifest({ manifestPath: manifest, outputDir: out }), error);
    await assert.rejects(stat(out), /ENOENT/);
  }
});

test("text is escaped as data and previously written output is never overwritten", async () => {
  const file = await copiedManifest(input => { input.headline = "A < B & C"; });
  const out = path.join(temp, "escaped");
  const first = await renderManifest({ manifestPath: file, outputDir: out });
  assert.equal(first.status, "rendered");
  const digest = await sha(path.join(out, "card.png"));
  await assert.rejects(renderManifest({ manifestPath: file, outputDir: out }), /EEXIST/);
  assert.equal(await sha(path.join(out, "card.png")), digest);
  assert.equal(validateManifest(JSON.parse(await readFile(file, "utf8"))).headline, "A < B & C");
});

test("larger screenshot presentation does not reveal pixels above or below the declared crop", async () => {
  const image = path.join(temp, "crop-bands.png");
  const bands = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">'
    + '<rect width="400" height="600" fill="#808080"/>'
    + '<rect width="400" height="95" fill="#ff0000"/>'
    + '<rect y="100" width="400" height="330" fill="#0000ff"/>'
    + '<rect y="435" width="400" height="165" fill="#00ff00"/></svg>';
  await writeFile(image, new Resvg(bands).render().asPng());
  const manifest = await copiedManifest(input => {
    for (const panel of input.panels) { panel.image = image; panel.cropY = 100; }
  });
  const rendered = await renderManifest({ manifestPath: manifest, outputDir: path.join(temp, "crop-bands") });
  const png = await readFile(path.join(rendered.output, "card.png"));
  const pixels = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="780">'
    + `<image width="1120" height="780" href="data:image/png;base64,${png.toString("base64")}"/></svg>`).render().pixels;
  let visible = 0, hidden = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b, a] = pixels.subarray(i, i + 4);
    if (a !== 255) continue;
    if (r === 0 && g === 0 && b === 255) visible++;
    if ((r === 255 && g === 0 && b === 0) || (r === 0 && g === 255 && b === 0)) hidden++;
  }
  assert.ok(visible > 100_000, "the selected image region must actually be drawn");
  assert.equal(hidden, 0, "source pixels outside the selected window must stay out of the exported card");
});

test("packaged CLI shape gives JSON success and explicit malformed-argument failure", async () => {
  const cli = path.join(root, "src/cli.js");
  const v = await execute(process.execPath, [cli, "--version"]); assert.equal(v.stdout.trim(), version);
  const successful = await execute(process.execPath, [cli, "demo", "--out", path.join(temp, "cli"), "--json"]);
  assert.equal(JSON.parse(successful.stdout).status, "rendered");
  await assert.rejects(execute(process.execPath, [cli, "demo", "--out", path.join(temp, "cli"), "--json"]), error => {
    assert.equal(error.code, 2); assert.equal(JSON.parse(error.stdout).status, "error"); return true;
  });
});

test("an explicitly named local CJK font produces a complete card and records the exact font", async () => {
  const original = JSON.parse(await readFile(path.join(root, "examples/demo-zh.json"), "utf8"));
  const font = path.join(root, "test/fixtures/ReleaseframeTestCJK.otf");
  original.font = path.relative(temp, font);
  for (const panel of original.panels) panel.image = path.join(root, "examples", panel.image);
  // No spaces: this caption needs character-aware wrapping in the fixed panel.
  original.panels[0].caption = "页面宽度需要复核".repeat(8);
  const input = path.join(temp, "chinese.json");
  await writeFile(input, JSON.stringify(original));
  const before = await sha(font);
  const result = await renderManifest({ manifestPath: input, outputDir: path.join(temp, "chinese") });
  const review = JSON.parse(await readFile(path.join(result.output, "review.json"), "utf8"));
  assert.equal(review.font.sha256, before);
  assert.equal(review.font.source, original.font);
  assert.equal(review.font.family, "ReleaseframeTestCJK");
  assert.equal(await sha(font), before);
  assert.deepEqual(result.panels.map(panel => panel.passes), [false, true]);
  assert.match(await readFile(path.join(result.output, "alt.txt"), "utf8"), /标签变长/);
  assert.match(await readFile(path.join(result.output, "post.txt"), "utf8"), /中文对照卡片/);
});

test("font failures and measured text overflow cannot produce a deceptively successful card", async () => {
  const invalidFont = path.join(temp, "invalid.otf");
  await writeFile(invalidFont, "not a font");
  for (const [label, edit, error] of [
    ["no-cjk-font", input => { input.headline = "中文卡片"; }, /set font/],
    ["missing-glyph", input => { input.font = path.join(root, "assets/fonts/Inter.ttf"); input.headline = "中文卡片"; }, /selected font lacks/],
    ["missing-font", input => { input.font = "absent.ttf"; }, /ENOENT/],
    ["bad-font", input => { input.font = invalidFont; }, /single TTF or OTF/],
    ["wide-headline", input => { input.headline = "W".repeat(59); }, /headline does not fit/],
    ["wide-caption", input => { input.panels[0].caption = "W".repeat(90); }, /caption does not fit in two lines/],
  ]) {
    const manifest = await copiedManifest(edit), out = path.join(temp, label);
    await assert.rejects(renderManifest({ manifestPath: manifest, outputDir: out }), error);
    await assert.rejects(stat(out), /ENOENT/);
  }
});
