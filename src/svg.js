export function renderCardSvg(manifest, panels, typography) {
  const out = [];
  const text = (value, x, y, size, width, field, extra = {}) => {
    out.push(typography.draw(value, { x, y, size, width, field, fill: "#19273b", ...extra }));
  };
  out.push('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1120" height="780" viewBox="0 0 1120 780">');
  out.push('<rect width="1120" height="780" fill="#f3f0e8"/>');
  text(`${manifest.brand} / ${manifest.version}`, 48, 52, 17, 510, "brand/version", { weight: 700, spacing: 1.2, fill: "#4e657e" });
  text(`${manifest.metric.label.toUpperCase()} / ${manifest.metric.mode === "at-most" ? "MAX" : "MIN"}`, 1072, 52, 17, 480, "metric.label", { weight: 700, spacing: 1.2, fill: "#4e657e", anchor: "end" });
  text(manifest.headline, 48, 113, 39, 1024, "headline", { weight: 700 });
  text(manifest.dek, 48, 150, 19, 1024, "dek", { fill: "#53667b" });

  for (const [index, panel] of panels.entries()) {
    const left = index === 0 ? 48 : 573;
    const imageLeft = left + 61;
    const imageHeight = panel.height * (375 / panel.width);
    const tag = panel.passes ? "WITHIN LIMIT" : "OUTSIDE LIMIT";
    const field = `panels[${index}]`;
    out.push(`<rect x="${left}" y="179" width="499" height="498" rx="13" fill="#fff" stroke="#d5dce5"/>`);
    text(panel.label, left + 21, 218, 20, 275, `${field}.label`, { weight: 700 });
    out.push(`<rect x="${left + 312}" y="198" width="165" height="27" rx="3" fill="${panel.passes ? "#dff5e6" : "#ffdfd1"}"/>`);
    text(tag, left + 394, 216, 12, 155, `${field}.badge`, { weight: 700, fill: panel.passes ? "#205b39" : "#7e2c11", anchor: "middle" });
    text("REFERENCE", left + 21, 247, 12, 145, `${field}.reference`, { spacing: 1, fill: "#61758a" });
    text("CANDIDATE", left + 187, 247, 12, 145, `${field}.candidate`, { spacing: 1, fill: "#61758a" });
    text(`${manifest.metric.baseline}${manifest.metric.unit}`, left + 21, 271, 22, 145, `${field}.baseline`, { weight: 700 });
    text(`${panel.value}${manifest.metric.unit}`, left + 187, 271, 22, 240, `${field}.value`, { weight: 700 });
    out.push(`<clipPath id="clip-${index}"><rect x="${imageLeft}" y="292" width="377" height="311"/></clipPath>`);
    out.push(`<rect x="${imageLeft}" y="292" width="377" height="311" fill="#fff" stroke="#aebfd0"/>`);
    out.push(`<image x="${imageLeft + 1}" y="${293 - panel.cropY * (375 / panel.width)}" width="375" height="${imageHeight}" clip-path="url(#clip-${index})" xlink:href="data:image/png;base64,${panel.base64}"/>`);
    for (const [lineIndex, line] of typography.wrap(panel.caption, 457, 14, `${field}.caption`).entries()) {
      text(line, left + 21, 628 + lineIndex * 19, 14, 457, `${field}.caption`, { fill: "#506177" });
    }
  }
  out.push('<line x1="48" y1="694" x2="1072" y2="694" stroke="#cbd4df"/>');
  text(manifest.source.label, 48, 718, 14, 1024, "source.label", { fill: "#5f7184" });
  text(manifest.scope, 48, 746, 13, 1024, "scope", { fill: "#5f7184" });
  out.push('</svg>');
  return out.join('\n');
}
