# Alpha.2 validation

Local Windows / Node 24.19.0, 2026-09-26:

- Seven workflow tests pass: complete English output, numeric semantics, invalid-input/no-output behavior, literal-text handling, CLI errors, a Chinese card with a relative custom-font path, and missing/bad fonts plus measured text overflow.
- The tarball installs in a temporary clean project with scripts disabled. Its packaged CLI produces both the English demo and a Chinese card using an explicitly supplied caller font, verifies the font hash and refuses an existing output directory.
- The English card and a Chinese card using the full Noto CJK font were visually reviewed locally. `docs/demo.png` and `docs/demo-zh.png` contain those authored illustrations. Inputs are examples, not customer screenshots or an adoption study.
- The CI workflow covers Linux, Windows and macOS, Node 22 and 24, including the offline CJK fixture and clean-package path. Hosted run outcomes are recorded in the GitHub release; this local note alone does not establish their result or physical-device acceptance.

The default font and all optional fonts stay local. No account operation, global font installation, system font search, online font request or model call is performed by Releaseframe. The selected font is not copied into the four output files. Numeric values remain caller declarations; font validation does not verify screenshot claims.
