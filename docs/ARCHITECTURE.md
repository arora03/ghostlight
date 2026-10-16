# Architecture

Ghostlight is organized as a pnpm workspace monorepo designed for cross-environment portability (browser, CLI, embedded).

## Layout

- `packages/core/`: Core domain library containing signal encoding, decoding, and mathematical foundations. Pure TypeScript with zero runtime dependencies.
- `docs/`: Architecture definitions, threat models, and verified capability claims.
