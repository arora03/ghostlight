# Project Rules

1. Core purity: packages/core must have zero dependencies on the DOM, browser APIs, Node-specific APIs, or system time. It operates only on plain arrays/typed arrays and explicit parameters. This lets the same code run in the web app, the CLI and future embedded builds.
2. Determinism: any randomness must use a seeded pseudo-random generator passed in as a parameter. Never call Math.random() or Date.now() in core. Every test and benchmark must be exactly reproducible from its seed.
3. No silent failures: functions that can fail on bad input must return a typed Result (ok/error) or throw a typed error. Never return a plausible-looking default. Never swallow errors.
4. Tests are mandatory: every new function ships with unit tests covering normal cases, edge cases and invalid input. A change without tests is incomplete.
5. One task at a time: only do what the current prompt asks. Do not add features, dependencies or files that were not requested. If something seems missing or ambiguous, stop and ask instead of guessing.
6. Honesty policy: never claim a capability in code comments, docs or README that has not been verified. Every capability claim goes in docs/CLAIMS.md as Measured, Simulated or Untested, with evidence. Infrared and mesh features, for example, are Simulated or Untested unless proven on real hardware.
7. Security: never implement custom cryptography. Encryption, when added later, must use the standard Web Crypto API (AES-GCM) with correct nonce handling.
8. Dependencies: add a dependency only when the prompt says so. Pin versions. Prefer none.
9. Naming and style: clear descriptive names, small pure functions, explicit return types on exported functions, JSDoc on every exported symbol.
10. Commits: conventional commit messages (feat:, fix:, test:, docs:, chore:). Keep commits small.
11. Git workflow: work on a branch named feat/<topic>, fix/<topic> or docs/<topic>; never commit directly to main; one logical change per commit; never use `git add .` or `git add -A`, stage files explicitly; never stage anything outside the repository's intended files (personal research PDFs and notes stay untracked).
12. Destructive git commands (reset --hard, clean -f, push --force, branch -D, rebase of already-pushed commits) are forbidden unless the owner explicitly requests them in the prompt. If one seems necessary, stop and ask.
