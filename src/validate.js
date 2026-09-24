const forbidden = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u;
const printableLatin = /^[\u0020-\u007e\u00a0-\u024f]*$/u;

function object(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value;
}

function field(value, name, max, { rendered = false, multiline = false } = {}) {
  if (typeof value !== "string" || !value.trim() || [...value].length > max || forbidden.test(value)) {
    throw new Error(`${name} must be non-empty text of at most ${max} characters without control or bidi override characters`);
  }
  if (!multiline && /[\r\n\t]/.test(value)) throw new Error(`${name} must be a single line`);
  if (rendered && !printableLatin.test(value)) throw new Error(`${name}: alpha.1 card text supports Latin characters only`);
  return value.trim();
}

function quantity(value, name, { minimum = 0, maximum = 1_000_000 } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be a finite number between ${minimum} and ${maximum}`);
  }
  return value;
}

function httpsUrl(value, name) {
  field(value, name, 400);
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} must be an HTTPS URL`); }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname) throw new Error(`${name} must be an HTTPS URL without credentials`);
  return url.href;
}

export function weightedPostLength(value) {
  // Conservative local gate, not an assertion that X will accept the draft.
  return [...value.replace(/https:\/\/\S+/gu, "")].reduce((sum, char) => sum + (char.codePointAt(0) > 0x7f ? 2 : 1), 0) + 23;
}

export function validateManifest(value) {
  const m = object(value, "manifest");
  if (m.schemaVersion !== "releaseframe/1") throw new Error("Expected schemaVersion releaseframe/1");
  const brand = field(m.brand, "brand", 25, { rendered: true });
  const version = field(m.version, "version", 22, { rendered: true });
  const headline = field(m.headline, "headline", 59, { rendered: true });
  const dek = field(m.dek, "dek", 95, { rendered: true });
  const source = object(m.source, "source");
  const sourceLabel = field(source.label, "source.label", 86, { rendered: true });
  const sourceUrl = httpsUrl(source.url, "source.url");
  const scope = field(m.scope, "scope", 105, { rendered: true });
  const releaseUrl = httpsUrl(m.releaseUrl, "releaseUrl");
  const postDraft = field(m.postDraft, "postDraft", 230, { multiline: true });
  if (postDraft.includes(releaseUrl)) throw new Error("postDraft should omit releaseUrl; it is appended once");
  const post = `${postDraft}\n\n${releaseUrl}`;
  if (weightedPostLength(post) > 280) throw new Error("Post draft exceeds the conservative 280-weight limit");

  const metric = object(m.metric, "metric");
  const metricLabel = field(metric.label, "metric.label", 24, { rendered: true });
  const unit = field(metric.unit, "metric.unit", 8, { rendered: true });
  if (!/^[A-Za-z%/]+$/.test(unit)) throw new Error("metric.unit accepts letters, % and / only");
  const baseline = quantity(metric.baseline, "metric.baseline");
  const tolerance = quantity(metric.tolerance, "metric.tolerance", { maximum: 10_000 });
  if (!["at-most", "at-least"].includes(metric.mode)) throw new Error("metric.mode must be at-most or at-least");
  if (!Array.isArray(m.panels) || m.panels.length !== 2) throw new Error("panels must have exactly two entries");
  const panels = m.panels.map((entry, index) => {
    const panel = object(entry, `panels[${index}]`);
    return {
      label: field(panel.label, `panels[${index}].label`, 29, { rendered: true }),
      value: quantity(panel.value, `panels[${index}].value`),
      image: field(panel.image, `panels[${index}].image`, 400),
      cropY: panel.cropY === undefined ? 0 : quantity(panel.cropY, `panels[${index}].cropY`, { maximum: 8000 }),
      caption: field(panel.caption, `panels[${index}].caption`, 90, { rendered: true }),
      alt: field(panel.alt, `panels[${index}].alt`, 250),
    };
  });
  return {
    schemaVersion: "releaseframe/1", brand, version, headline, dek,
    metric: { label: metricLabel, unit, baseline, tolerance, mode: metric.mode },
    panels, source: { label: sourceLabel, url: sourceUrl }, scope, releaseUrl, postDraft, post,
  };
}
