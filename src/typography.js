import { create } from "fontkit";

const xml = value => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
})[char]);

/** Shape and draw the same font bytes, without machine-font lookup or fallback. */
export function createTypography(bytes) {
  if (bytes.length > 20_000_000 || !["00010000", "4f54544f"].includes(bytes.subarray(0, 4).toString("hex"))) {
    throw new Error("font must be a single TTF or OTF file of at most 20 MB");
  }
  let font;
  try { font = create(bytes); } catch (error) { throw new Error(`Could not read font: ${error.message}`); }
  if (!Number.isFinite(font.unitsPerEm) || font.unitsPerEm <= 0) throw new Error("font has invalid unitsPerEm");
  const faces = new Map();
  function face(weight) {
    if (!faces.has(weight)) {
      const axis = font.variationAxes?.wght;
      faces.set(weight, axis ? font.getVariation({ wght: Math.max(axis.min, Math.min(axis.max, weight)) }) : font);
    }
    return faces.get(weight);
  }
  function shape(value, size, weight = 400, spacing = 0, field = "card text") {
    const selected = face(weight);
    for (const char of value) {
      if (!selected.hasGlyphForCodePoint(char.codePointAt(0))) {
        throw new Error(`${field}: selected font lacks ${char} (U+${char.codePointAt(0).toString(16).toUpperCase()}); choose a font covering the card text`);
      }
    }
    const run = selected.layout(value);
    const scale = size / selected.unitsPerEm;
    let cursor = 0, minX = 0, maxX = 0;
    const glyphs = run.glyphs.map((glyph, index) => {
      const position = run.positions[index];
      const offset = cursor + position.xOffset * scale;
      const bounds = glyph.bbox;
      minX = Math.min(minX, offset + bounds.minX * scale);
      maxX = Math.max(maxX, offset + bounds.maxX * scale);
      const placed = { glyph, x: offset, y: position.yOffset * scale };
      cursor += position.xAdvance * scale + (index < run.glyphs.length - 1 ? spacing : 0);
      return placed;
    });
    const width = Math.max(cursor, maxX) - minX;
    if (!Number.isFinite(width)) throw new Error(`${field}: font produced invalid glyph metrics`);
    return { glyphs, scale, minX, width };
  }
  return {
    family: font.familyName,
    postscriptName: font.postscriptName,
    draw(value, { x, y, size, fill, width, field, weight = 400, spacing = 0, anchor = "start" }) {
      const run = shape(value, size, weight, spacing, field);
      if (run.width > width) throw new Error(`${field} does not fit its ${width}px text area; shorten it or choose a narrower font`);
      const left = x - (anchor === "middle" ? run.width / 2 : anchor === "end" ? run.width : 0) - run.minX;
      return `<g fill="${xml(fill)}" data-field="${xml(field)}">` + run.glyphs.map(({ glyph, x: dx, y: dy }) =>
        `<path d="${glyph.path.toSVG()}" transform="translate(${left + dx} ${y - dy}) scale(${run.scale} ${-run.scale})"/>`).join("") + "</g>";
    },
    wrap(value, width, size, field) {
      const result = [];
      let current = "";
      for (const { segment } of new Intl.Segmenter("und", { granularity: "grapheme" }).segment(value)) {
        if (shape(current + segment, size, 400, 0, field).width <= width) {
          current += segment;
          continue;
        }
        const space = current.lastIndexOf(" ");
        if (space > 0) {
          result.push(current.slice(0, space));
          current = current.slice(space + 1) + segment;
        } else {
          if (!current) throw new Error(`${field} contains a glyph wider than its text area`);
          result.push(current);
          current = segment.trimStart();
        }
      }
      if (current.trim()) result.push(current.trim());
      if (result.length > 2) throw new Error(`${field} does not fit in two lines; shorten it`);
      return result;
    },
  };
}
