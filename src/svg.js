export function renderCardSvg(manifest, panels, typography) {
  const out = [];
  const text = (value, x, y, size, width, field, extra = {}) => {
    out.push(typography.draw(value, { x, y, size, width, field, fill: "#19252b", ...extra }));
  };
  out.push('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1120" height="780" viewBox="0 0 1120 780">');
  out.push('<rect width="1120" height="780" fill="#f2f0ea"/>');
  out.push('<rect x="48" y="30" width="5" height="14" fill="#e77b52"/>');
  text(`${manifest.brand} / ${manifest.version}`, 65, 43, 14, 510, "brand/version", { weight: 650, spacing: 1, fill: "#4d6269" });
  text(`${manifest.metric.label.toUpperCase()} / ${manifest.metric.mode === "at-most" ? "MAX" : "MIN"}`, 1072, 43, 14, 480, "metric.label", { weight: 650, spacing: 1, fill: "#4d6269", anchor: "end" });
  text(`REFERENCE ${manifest.metric.baseline}${manifest.metric.unit}   TOLERANCE ${manifest.metric.tolerance}${manifest.metric.unit}`, 1072, 66, 12, 510, "metric.reference", { fill: "#627378", anchor: "end" });
  text(manifest.headline, 48, 110, 39, 1024, "headline", { weight: 700 });
  text(manifest.dek, 48, 150, 18, 1024, "dek", { fill: "#596d73" });
  out.push('<line x1="48" y1="172" x2="1072" y2="172" stroke="#cbd2cf"/>');

  for (const [index, panel] of panels.entries()) {
    const left = index === 0 ? 48 : 584;
    const imageHeight = panel.height * (375 / panel.width);
    const tag = panel.passes ? "WITHIN LIMIT" : "OUTSIDE LIMIT";
    const statusColor = panel.passes ? "#386954" : "#a9462d";
    const field = `panels[${index}]`;
    text(panel.label, left, 202, 17, 235, `${field}.label`, { weight: 650 });
    text(`${panel.value}${manifest.metric.unit}`, left + 488, 202, 22, 240, `${field}.value`, { weight: 700, anchor: "end" });
    // Scale the old viewport as a whole so existing cropY values expose the
    // same source window, rather than silently revealing more of a screenshot.
    out.push(`<g transform="translate(${left} 219) scale(${488 / 377})">`);
    out.push(`<clipPath id="clip-${index}"><rect width="377" height="311"/></clipPath>`);
    out.push('<rect width="377" height="311" fill="#fff" stroke="#b9c6c7" stroke-width="0.75"/>');
    out.push(`<image x="1" y="${1 - panel.cropY * (375 / panel.width)}" width="375" height="${imageHeight}" clip-path="url(#clip-${index})" xlink:href="data:image/png;base64,${panel.base64}"/>`);
    out.push('</g>');
    out.push(`<circle cx="${left + 3}" cy="643" r="3" fill="${statusColor}"/>`);
    text(tag, left + 14, 647, 12, 180, `${field}.badge`, { weight: 700, spacing: 0.5, fill: statusColor });
    for (const [lineIndex, line] of typography.wrap(panel.caption, 488, 14, `${field}.caption`).entries()) {
      text(line, left, 672 + lineIndex * 19, 14, 488, `${field}.caption`, { fill: "#52666d" });
    }
  }
  out.push('<line x1="48" y1="714" x2="1072" y2="714" stroke="#cbd2cf"/>');
  text(manifest.source.label, 48, 741, 14, 1024, "source.label", { fill: "#53676d" });
  text(manifest.scope, 48, 766, 13, 1024, "scope", { fill: "#53676d" });
  out.push('</svg>');
  return out.join('\n');
}
