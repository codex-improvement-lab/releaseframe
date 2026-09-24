# Changelog

## 0.1.0-alpha.1

- Render two caller-listed local PNGs into a fixed 1120×780 comparison card without a browser or network access.
- Compute `at-most` and `at-least` badges from declared numeric values and a tolerance. Store image hashes and explicit claim boundaries in `review.json`.
- Write ALT text and a caller-authored post draft beside the PNG. Refuse unsupported images, mismatched dimensions, off-frame crops, missing source/caveat, excessive text and existing output directories.
- Ship an authored demo, pinned OFL Inter font, API/CLI, tests and clean package smoke path.

Preview scope: Latin card text; supplied values are not inferred from screenshots; no secret removal, automatic posting, pixel equivalence or user-adoption claim.
