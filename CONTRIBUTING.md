# Contributing

Thanks for helping improve CoMate.

## Local Setup

```bash
npm install
npm test
npm run build
```

For the desktop app:

```bash
npm run desktop
```

## Privacy Boundary

CoMate is designed as a fully local companion for the Codex desktop app. Contributions should preserve that boundary:

- Do not add telemetry, analytics, or remote uploads.
- Do not commit generated images, session logs, SQLite databases, build output, or private local paths.
- Keep Codex Desktop data reads local to the user's machine.
- Prefer explicit UI states when Codex Desktop data is missing or empty.

## Pull Requests

Before opening a PR, run:

```bash
npm test
npm run build
```

Keep changes scoped and include tests for new business logic or state handling.
