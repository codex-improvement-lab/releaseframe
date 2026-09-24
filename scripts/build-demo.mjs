import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const font = path.join(root, "assets/fonts/Inter.ttf");
for (const name of ["demo-before", "demo-after"]) {
  const svg = await fs.readFile(path.join(root, "examples", name + ".svg"));
  const png = new Resvg(svg, { font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: "Inter" } }).render().asPng();
  await fs.writeFile(path.join(root, "examples", name + ".png"), png);
}
console.log("Authored demo PNGs regenerated from the checked-in SVGs.");
