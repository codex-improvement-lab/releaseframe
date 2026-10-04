import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { Resvg } from "@resvg/resvg-js";
import { renderCardSvg } from "./svg.js";
import { validateManifest } from "./validate.js";
import { createTypography } from "./typography.js";

export const version = "0.1.0-alpha.3";
export { validateManifest, weightedPostLength } from "./validate.js";

const sha256 = value => createHash("sha256").update(value).digest("hex");
const pngSignature = "89504e470d0a1a0a";

async function preparePanel(panel, index, manifestDir, metric) {
  const imagePath = path.resolve(manifestDir, panel.image);
  const bytes = await fs.readFile(imagePath);
  if (bytes.length > 10_000_000 || bytes.subarray(0, 8).toString("hex") !== pngSignature || bytes.length < 24) {
    throw new Error(`panels[${index}].image must be PNG of at most 10 MB`);
  }
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width < 100 || width > 8000 || height < 100 || height > 8000) throw new Error(`panels[${index}].image dimensions must be 100..8000 pixels`);
  if (!Number.isInteger(panel.cropY) || panel.cropY > Math.max(0, height - 311 * width / 375)) throw new Error(`panels[${index}].cropY exceeds the visible screenshot range`);
  const passes = metric.mode === "at-most"
    ? panel.value <= metric.baseline + metric.tolerance
    : panel.value >= metric.baseline - metric.tolerance;
  return { ...panel, width, height, bytes: bytes.length, sha256: sha256(bytes), base64: bytes.toString("base64"), passes };
}

/** Render only caller-listed local PNGs. The declared metric is not inferred from pixels. */
export async function renderManifest({ manifestPath, outputDir }) {
  if (typeof manifestPath !== "string" || !manifestPath) throw new Error("A manifest path is required");
  if (typeof outputDir !== "string" || !outputDir) throw new Error("An unused output directory is required");
  const absoluteManifest = path.resolve(manifestPath);
  const manifest = validateManifest(JSON.parse(await fs.readFile(absoluteManifest, "utf8")));
  const panels = await Promise.all(manifest.panels.map((panel, index) =>
    preparePanel(panel, index, path.dirname(absoluteManifest), manifest.metric)));
  if (panels[0].width !== panels[1].width || panels[0].height !== panels[1].height) {
    throw new Error("Comparison screenshots must have the same dimensions");
  }
  const fontPath = manifest.font ? path.resolve(path.dirname(absoluteManifest), manifest.font)
    : fileURLToPath(new URL("../assets/fonts/Inter.ttf", import.meta.url));
  if ((await fs.stat(fontPath)).size > 20_000_000) throw new Error("font must be at most 20 MB");
  const fontBytes = await fs.readFile(fontPath);
  const typography = createTypography(fontBytes);
  const svg = renderCardSvg(manifest, panels, typography);
  let png;
  try {
    png = new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
  } catch (error) { throw new Error(`Could not render the supplied PNGs: ${error.message}`); }
  const alt = `${manifest.brand} ${manifest.version}: ${manifest.headline} ${manifest.metric.label} reference ${manifest.metric.baseline}${manifest.metric.unit}, tolerance ${manifest.metric.tolerance}${manifest.metric.unit}. `
    + panels.map((panel, index) => `Panel ${index + 1}, ${panel.label}: ${panel.value}${manifest.metric.unit}, ${panel.passes ? "within" : "outside"} the declared limit. ${panel.alt}`).join(" ")
    + ` Source: ${manifest.source.label} (${manifest.source.url}). Scope: ${manifest.scope} The values were declared in the manifest, not measured from the images.`;
  if ([...alt].length > 1000) throw new Error("Combined ALT text exceeds 1,000 characters; shorten panel descriptions");
  const review = {
    schemaVersion: "releaseframe-review/1", version, metric: manifest.metric,
    font: { source: manifest.font ?? "bundled:Inter.ttf", family: typography.family,
      postscriptName: typography.postscriptName, sha256: sha256(fontBytes), bytes: fontBytes.length },
    panels: panels.map(panel => ({ label: panel.label, image: panel.image, imageSha256: panel.sha256,
      imageBytes: panel.bytes, dimensions: [panel.width, panel.height], cropY: panel.cropY, value: panel.value, passes: panel.passes })),
    source: manifest.source, scope: manifest.scope, releaseUrl: manifest.releaseUrl,
    imageSha256: sha256(png), imageBytes: png.length,
    declaredValuesNotMeasuredFromImages: true, privacyReviewRequired: true,
    statement: "The numeric outcome follows the caller's declared values and threshold. Review the screenshots and wording before sharing.",
  };
  const out = path.resolve(outputDir);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.mkdir(out); // Never overwrite an existing output directory.
  await fs.writeFile(path.join(out, "card.png"), png);
  await fs.writeFile(path.join(out, "alt.txt"), alt + "\n");
  await fs.writeFile(path.join(out, "post.txt"), manifest.post + "\n");
  await fs.writeFile(path.join(out, "review.json"), JSON.stringify(review, null, 2) + "\n");
  return { status: "rendered", version, output: out, imageSha256: review.imageSha256,
    imageBytes: png.length, panels: review.panels.map(({ label, value, passes }) => ({ label, value, passes })),
    files: ["card.png", "alt.txt", "post.txt", "review.json"] };
}
