# Changelog

## 0.1.0-alpha.3

- Give the screenshots a larger, shared-scale presentation in the same 1120×780 card. Reduce surrounding chrome, show the reference and tolerance once, and retain explicit within/outside labels beside each caption.
- Preserve the existing source-image crop window when enlarging it; add a pixel-based regression that checks selected content is visible while sentinel bands outside the crop remain hidden.
- Regenerate the authored SVG examples at 2× pixel density and scale their example `cropY` values accordingly. Keep the same logical scene and declared illustration values.
- Keep schema/1, the four delivery files, font coverage and measured overflow checks, declared-value semantics and no-overwrite behavior. Card pixels and bundled demo PNG hashes change.

## 0.1.0-alpha.2

- Accept one explicitly named local TTF/OTF font in the manifest, enabling Chinese and other covered card text without a global font install or network request. Keep bundled Inter as the default.
- Shape text into outlines from the same font bytes used for coverage and width checks; reject missing glyphs and text that cannot fit before writing output. Wrap captions by measured width, including text without spaces.
- Record font family, source, byte size and SHA-256 in review JSON. Existing schema/1 manifests remain valid, although card pixels change with the improved typography.
- Add a Chinese example, an attributed OFL test font subset, negative layout/font checks and a custom-font path in clean-package CI. No general guarantee for every script, emoji or arbitrary font.

## 0.1.0-alpha.1

- Render two caller-listed local PNGs into a fixed 1120×780 comparison card without a browser or network access.
- Compute `at-most` and `at-least` badges from declared numeric values and a tolerance. Store image hashes and explicit claim boundaries in `review.json`.
- Write ALT text and a caller-authored post draft beside the PNG. Refuse unsupported images, mismatched dimensions, off-frame crops, missing source/caveat, excessive text and existing output directories.
- Ship an authored demo, pinned OFL Inter font, API/CLI, tests and clean package smoke path.

Preview scope: text covered by the selected local font; supplied values are not inferred from screenshots; no secret removal, automatic posting or user-adoption claim.
