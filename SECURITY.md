# Security

CoMate is a fully local app. It indexes files from the Codex desktop app data folder on the user's machine and serves the UI through a localhost-only server.

## Reporting a Vulnerability

Please report security issues privately by opening a GitHub security advisory for this repository when available, or by contacting the repository owner through GitHub.

Do not file public issues for vulnerabilities that expose private local data, allow arbitrary file reads, or bypass the localhost-only trust boundary.

## Security Expectations

- The app should not upload images, prompts, session metadata, or file paths.
- The local HTTP server should bind only to loopback addresses.
- File open/reveal actions should operate only on indexed image records.
- Build artifacts should not include local databases, generated images, or session logs.
