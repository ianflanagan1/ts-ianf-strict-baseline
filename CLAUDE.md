# ts-ianf-strict-baseline

See README.md. `devbox run -- task check` runs everything, and must pass before finishing a change.

- After changing `src/core/listing.ts`, run `devbox run -- task rulebook-coverage`, then `check`.
- `docs/eslint-rules-to-build.md` lists every ESLint rule the baseline still needs. When a clause needs a rule the baseline doesn't have, or a requirement for a planned rule arrives or changes, add or change its entry in the same change, in the form the file gives, and don't build the rule in that change. Build one rule to a session, test-first, and delete its entry in the change that adds it. `src/rulebook/eslintRulesToBuild.test.ts` fails on an entry that is incomplete, that names a clause the listing lacks or covers in full, or that names a rule that exists.
