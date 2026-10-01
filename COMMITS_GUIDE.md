# Commits Guide

Every commit in this repository must follow the **Conventional Commits** standard. Commit messages are the historical record of the project; the version and the changelog are maintained by hand (see [Manual release](#manual-release)).

Husky + commitlint are enforced locally:

- `.husky/commit-msg` runs `commitlint --edit` and rejects malformed commit messages.
- `.husky/pre-commit` runs `npm test`.

## Format

```
type(scope): description
```

- `type` – one of the types listed below (always lowercase).
- `scope` – optional, a short context (e.g. `movements`, `categories`, `dashboard`).
- `description` – a brief summary, in English, lowercase, imperative mood.

## Types and their impact

| Type       | Changelog highlight | Changelog label     |
| ---------- | ------------------- | ------------------- |
| `feat`     | Yes                 | Nueva Funcionalidad |
| `fix`      | Yes                 | Corrección de Error |
| `chore`    | No                  | –                   |
| `refactor` | No                  | –                   |
| `style`    | No                  | –                   |
| `ci`       | No                  | –                   |
| `docs`     | No                  | –                   |
| `perf`     | No                  | –                   |
| `build`    | No                  | –                   |
| `test`     | No                  | –                   |
| `revert`   | No                  | –                   |

Only `feat` and `fix` become changelog highlights. Pick the version bump accordingly:

- **MAJOR** (`v0.1.0 -> v1.0.0`) – for a breaking change (`BREAKING CHANGE` or `!`, e.g. `feat!: remove old export format`).
- **MINOR** (`v0.1.0 -> v0.2.0`) – when the release adds at least one `feat`.
- **PATCH** (`v0.1.0 -> v0.1.1`) – when the release only contains `fix` commits.

## Rules (enforced by Husky)

- Type must be one of the valid values, **lowercase** (`feat`, not `Feat` or `Feature`).
- A single space after the colon: `feat: description`.
- Header (type + scope + description) must stay under **100 characters**.
- The description must be non-empty.
- Breaking changes are declared with `!` after the type/scope or a `BREAKING CHANGE:` line in the body.

Write the description as a short, self-contained summary: it is the easiest source when writing the next changelog entry by hand.

## Valid examples

```
feat(movements): add filter by account
```

```
feat(dashboard): add account detail view
```

```
fix(categories): persist balance when deleting an account
```

```
chore(deps): bump Angular to v22
```

```
refactor(core): split finance model into domain folders
```

The last two are valid and will be merged, but they are not changelog material.

## Invalid examples (rejected by Husky)

```
save my changes
```

Rejected – missing the `type:` prefix entirely.

```
Fix(movements): filter by account
```

Rejected – the type must be lowercase (`fix`).

```
feat(movements): filter by account and date range plus recurring movements and budget reports
```

Rejected – the header exceeds the 100-character limit.

## Manual release

There is no automation: no workflow, no generation script. A release is a normal commit performed by hand.

1. Bump the version in `package.json` (`npm version --no-git-tag-version <major|minor|patch>`).
2. Add the new entry at the top of `src/assets/changelog.json`, newest first:

   ```json
   {
     "version": "v0.5.0",
     "fecha": "2026-10-01",
     "highlights": [
       "Nueva Funcionalidad: agregar movimientos programados",
       "Corrección de Error: alinear el logo en escritorio"
     ]
   }
   ```

   `highlights` follow the `feat` / `fix` convention above, and `fecha` is the release date in `YYYY-MM-DD`.
3. Update `APP_VERSION` in `src/app/core/constants/app-version.constant.ts` – it is rendered in the sidebar footer and must match `package.json`.
4. Build and test, then commit and tag:

   ```bash
   npm test
   npx ng build --configuration production
   git commit -am "chore(release): bump version to v0.5.0"
   git tag v0.5.0
   git push origin HEAD --follow-tags
   ```

Deploy the `dist/` build after tagging so the service worker ships the new version.
