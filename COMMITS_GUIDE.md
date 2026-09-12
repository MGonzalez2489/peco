# Commits Guide

Every commit in this repository must follow the **Conventional Commits** standard. A CI pipeline reads the git history to compute the next semantic version and generate the changelog for the PWA, so a well-formed commit history is what drives the release.

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

| Type        | Appears in the PWA (highlights) | Changelog label           |
| ----------- | ------------------------------- | ------------------------- |
| `feat`      | Yes                             | Nueva Funcionalidad       |
| `fix`       | Yes                             | Corrección de Error       |
| `chore`     | No                              | –                         |
| `refactor`  | No                              | –                         |
| `style`     | No                              | –                         |
| `ci`        | No                              | –                         |
| `docs`      | No                              | –                         |
| `perf`      | No                              | –                         |
| `build`     | No                              | –                         |
| `test`      | No                              | –                         |
| `revert`    | No                              | –                         |

Only `feat` and `fix` commits are collected into `src/assets/changelog.json`. A release bumps:

- **MAJOR** (`v0.1.0 -> v1.0.0`) – when a commit includes `BREAKING CHANGE` or uses a `!` (e.g. `feat!: remove old export format`).
- **MINOR** (`v0.1.0 -> v0.2.0`) – when there is at least one `feat`.
- **PATCH** (`v0.1.0 -> v0.1.1`) – when there are only `fix` commits.

## Rules (enforced by Husky)

- Type must be one of the valid values, **lowercase** (`feat`, not `Feat` or `Feature`).
- A single space after the colon: `feat: description`.
- Header (type + scope + description) must stay under **100 characters**.
- The description must be non-empty.
- Breaking changes are declared with `!` after the type/scope or a `BREAKING CHANGE:` line in the body.

The commit description is copied verbatim into the changelog highlights, so write it as a short, self-contained user-facing description.

## Valid examples

```
feat(movements): add filter by category
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

The last two are valid and will be merged, but they never reach the end-user changelog.

## Invalid examples (rejected by Husky)

```
save my changes
```

Rejected – missing the `type:` prefix entirely.

```
Fix(movements): filter by category
```

Rejected – the type must be lowercase (`fix`).

```
feat(movements): filter by category and date range plus recurring movements and budget reports
```

Rejected – the header exceeds the 100-character limit.

## What happens on merge

When a pull request from `dev` is merged into `main`, the workflow `.github/workflows/release-changelog.yml` runs automatically: it scans the commits since the last version tag, bumps `package.json`, updates `src/assets/changelog.json`, commits the release (message `chore(release): bump version to vX.Y.Z [skip ci]`) and creates the corresponding `vX.Y.Z` tag.