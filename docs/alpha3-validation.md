# Alpha.3 validation

Local Windows / Node 24.19.0, 2026-10-04:

- Eight workflow tests cover deterministic English output, metric direction/tolerance, invalid inputs without output, text handling, no overwrite, CLI behavior, a caller-supplied CJK font, font/layout errors, and a new pixel-based crop check.
- The crop regression draws a visible blue band between hidden red and green bands. The final PNG must contain substantial blue and no pixels from either hidden band. The renderer scales the previous viewport as a whole, so a larger presentation does not expand the selected source window.
- The canvas remains 1120×780. Each screenshot frame grows from 377×311 to the same aspect ratio at 488px wide, approximately 67.5% more area. The reference and tolerance appear together; each panel retains explicit within/outside text.
- English, Chinese with the explicitly supplied full Noto CJK font, and a two-line-caption example were rendered and visually inspected. The original template was also rendered against the same new 2× example PNGs for a fair layout comparison. These are authored examples, not customer incidents or adoption evidence.
- Authored input PNGs are regenerated at 2× density from the same checked-in SVGs. Their example crop offsets are doubled from 100 to 200 source pixels, preserving the logical scene. A user's existing inputs and crop offsets do not need this change.

The clean-package smoke check installs the tarball without external install scripts, invokes the installed CLI, renders English and caller-font Chinese output and checks no-overwrite behavior. GitHub CI covers Linux, Windows and macOS with Node 22 and 24; hosted results and exact artifact checksums belong to the release record. This local document does not assert physical-device acceptance or that someone independently chose the product.

All four outputs and schema/1 remain available. The renderer still reads only explicitly listed PNG/font paths and uses declared numbers; visual presentation does not validate the truth or sufficiency of the screenshots.
