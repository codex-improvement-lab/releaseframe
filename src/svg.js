const xml = value => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
})[char]);

function captionLines(value) {
  const words = value.split(/\s+/), result = [];
  let current = "";
  for (const word of words) {
    if (word.length > 55) throw new Error("Caption has an unbreakable word over 55 characters");
    if (`${current} ${word}`.trim().length > 55) { result.push(current); current = word; }
    else current = `${current} ${word}`.trim();
  }
  if (current) result.push(current);
  if (result.length > 2) throw new Error("Caption does not fit in two lines; shorten it");
  return result;
}

export function renderCardSvg(manifest, panels, fontBytes) {
  const out = [];
  out.push('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1120" height="780" viewBox="0 0 1120 780">');
  out.push(`<defs><style>@font-face{font-family:Inter;src:url(data:font/ttf;base64,${fontBytes.toString("base64")}) format('truetype')}</style></defs>`);
  out.push('<rect width="1120" height="780" fill="#f3f0e8"/>');
  out.push(`<text x="48" y="52" font-family="Inter" font-size="17" font-weight="700" letter-spacing="1.2" fill="#4e657e">${xml(manifest.brand)} / ${xml(manifest.version)}</text>`);
  out.push(`<text x="1072" y="52" text-anchor="end" font-family="Inter" font-size="17" font-weight="700" letter-spacing="1.2" fill="#4e657e">${xml(manifest.metric.label.toUpperCase())} / ${manifest.metric.mode === "at-most" ? "MAX" : "MIN"}</text>`);
  out.push(`<text x="48" y="113" font-family="Inter" font-size="39" font-weight="700" fill="#19273b">${xml(manifest.headline)}</text>`);
  out.push(`<text x="48" y="150" font-family="Inter" font-size="19" fill="#53667b">${xml(manifest.dek)}</text>`);

  for (const [index, panel] of panels.entries()) {
    const left = index === 0 ? 48 : 573;
    const imageLeft = left + 61;
    const imageHeight = panel.height * (375 / panel.width);
    const tag = panel.passes ? "WITHIN LIMIT" : "OUTSIDE LIMIT";
    out.push(`<rect x="${left}" y="179" width="499" height="498" rx="13" fill="#fff" stroke="#d5dce5"/>`);
    out.push(`<text x="${left + 21}" y="218" font-family="Inter" font-size="20" font-weight="700" fill="#19273b">${xml(panel.label)}</text>`);
    out.push(`<rect x="${left + 312}" y="198" width="165" height="27" rx="3" fill="${panel.passes ? "#dff5e6" : "#ffdfd1"}"/>`);
    out.push(`<text x="${left + 394}" y="216" text-anchor="middle" font-family="Inter" font-size="12" font-weight="700" fill="${panel.passes ? "#205b39" : "#7e2c11"}">${tag}</text>`);
    out.push(`<text x="${left + 21}" y="247" font-family="Inter" font-size="12" letter-spacing="1" fill="#61758a">REFERENCE</text>`);
    out.push(`<text x="${left + 187}" y="247" font-family="Inter" font-size="12" letter-spacing="1" fill="#61758a">CANDIDATE</text>`);
    out.push(`<text x="${left + 21}" y="271" font-family="Inter" font-size="22" font-weight="700" fill="#19273b">${manifest.metric.baseline}${xml(manifest.metric.unit)}</text>`);
    out.push(`<text x="${left + 187}" y="271" font-family="Inter" font-size="22" font-weight="700" fill="#19273b">${panel.value}${xml(manifest.metric.unit)}</text>`);
    out.push(`<clipPath id="clip-${index}"><rect x="${imageLeft}" y="292" width="377" height="311"/></clipPath>`);
    out.push(`<rect x="${imageLeft}" y="292" width="377" height="311" fill="#fff" stroke="#aebfd0"/>`);
    out.push(`<image x="${imageLeft + 1}" y="${293 - panel.cropY * (375 / panel.width)}" width="375" height="${imageHeight}" clip-path="url(#clip-${index})" xlink:href="data:image/png;base64,${panel.base64}"/>`);
    for (const [lineIndex, line] of captionLines(panel.caption).entries()) {
      out.push(`<text x="${left + 21}" y="${628 + lineIndex * 19}" font-family="Inter" font-size="14" fill="#506177">${xml(line)}</text>`);
    }
  }
  out.push('<line x1="48" y1="694" x2="1072" y2="694" stroke="#cbd4df"/>');
  out.push(`<text x="48" y="718" font-family="Inter" font-size="14" fill="#5f7184">${xml(manifest.source.label)}</text>`);
  out.push(`<text x="48" y="746" font-family="Inter" font-size="13" fill="#5f7184">${xml(manifest.scope)}</text>`);
  out.push('</svg>');
  return out.join('\n');
}
