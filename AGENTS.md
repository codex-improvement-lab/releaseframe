# Releaseframe

Product promise: turn two already captured PNG screenshots and a declared numeric
acceptance threshold into one readable local comparison image with its ALT text,
editable post draft and compact review JSON. Serve agents completing a release or
handoff. The input claim, source and caveat come from the caller; do not infer
truth, approval, user adoption or a root cause from screenshots alone.

Keep the first result local and complete. Never silently read files except the
manifest, image and optional font paths it explicitly names. Never upload, post, sign in, invoke
an LLM, inspect browser profiles or add telemetry. Refuse missing, unsupported,
oversized or mismatched inputs and existing output directories. Do not describe
the output as a privacy scrubber. Source screenshots and exported SVG can contain
sensitive data; tell the user to review them before sharing.

An optional `font` explicitly names one local TTF/OTF, relative to the manifest.
Use those exact bytes for glyph coverage, layout and rendering. Do not discover,
download or install fonts automatically. Missing glyphs and over-wide text must
fail before creating output. The chosen font's hash belongs in review.json.

This first-level directory is its own Git repository. Run Git, dependency,
tests, package and release commands here. Preserve edits by others and sibling
repos. Pin dependencies with pnpm; install browser-free renderer packages without
running external postinstall scripts. Do not change the Lab parent into a monorepo.

Make positive and negative tests cover the real contract. Separate automated
rendering, hosted CI, human visual review and external adoption evidence.
The Lab owner has existing user authority to publish tested GitHub previews and
relevant promotion; do not claim npm publication or physical-device acceptance.
