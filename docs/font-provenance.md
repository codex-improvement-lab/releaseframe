# Inter font provenance

The `assets/fonts/Inter.ttf` bytes were downloaded from `google/fonts` commit `23e54b51ddffbc7713c583748e3bd86f62b1fa4a5606bad55` at `ofl/inter/Inter[opsz,wght].ttf`.

- Font bytes: 876,576
- SHA-256: `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031`
- OFL notice: `assets/fonts/OFL.txt`, SHA-256 `5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57`

The font stays under the SIL Open Font License in that file. Releaseframe's own code is MIT. Bundling the font avoids relying on whatever family happens to be installed on the user's machine for PNG rendering. It does not establish identical raster output across every OS and renderer build; cross-platform CI and local visual review are recorded separately.

## Optional fonts in alpha.2

The Chinese example image was rendered with `NotoSansCJKsc-Regular.otf` from the official [Noto CJK repository](https://github.com/notofonts/noto-cjk/blob/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf), SHA-256 `2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b` (16,437,364 bytes). Its [SIL OFL license](https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE) covers the font. The full font is not included in this package or automatically downloaded.

The source repository contains a smaller, renamed `ReleaseframeTestCJK.otf` under `test/fixtures`, with its OFL notice and transformation/source hashes in `font-provenance.json`. It includes printable ASCII and the Chinese example's characters solely for offline CI, is not a general Chinese font, and is excluded from the release tarball. The original font's copyright/license metadata is retained.

The optional manifest `font` path is caller-supplied. Alpha.2 records its hash and shapes/render its outlines directly, so coverage checks, width measurement and PNG generation use the same bytes. Static regular fonts are not falsely labeled as a separately supplied bold face. Complex scripts, emoji and arbitrary fonts still need visual review; the executed coverage here is Latin and Chinese.
