# Architecture

Ghostlight is organized as a pnpm workspace monorepo designed for cross-environment portability (browser, CLI, embedded).

## Layout

- `packages/core/`: Core domain library containing signal encoding, decoding, and mathematical foundations. Pure TypeScript with zero runtime dependencies.
- `docs/`: Architecture definitions, threat models, and verified capability claims.

## Timing model

### Unit Table (ITU-R M.1677-1)

| Element                               | State | Duration (units) |
| ------------------------------------- | ----- | ---------------- |
| Dot                                   | On    | 1                |
| Dash                                  | On    | 3                |
| Intra-character gap (between symbols) | Off   | 1                |
| Inter-character gap (between letters) | Off   | 3                |
| Inter-word gap (between words)        | Off   | 7                |

Segments strictly alternate between On and Off, starting and ending On with no leading or trailing silence.

### WPM Formula (PARIS Standard)

Transmission speed is normalized to the standard reference word `PARIS` (50 timing units total: 43 units for letters and intra/inter-character spaces + 7 units inter-word space):

$$\text{unitSeconds} = \frac{60}{50 \times \text{WPM}} = \frac{1.2}{\text{WPM}}$$

Valid transmission rates are strictly bounded to $5 \le \text{WPM} \le 60$.

### Cumulative Boundary Rounding Rule

To eliminate cumulative discretization error across alternating segments when samples-per-unit is non-integer, discrete sample boundaries are computed from the running cumulative unit count:

$$\text{boundarySample}(k) = \text{round}(\text{cumulativeUnits}(k) \times \text{unitSeconds} \times \text{sampleRate})$$

Segment $k$ fills discrete samples over the half-open interval $[\text{boundarySample}(k-1), \text{boundarySample}(k))$ with $\text{boundarySample}(-1) = 0$. The total buffer length equals exactly $\text{round}(\text{totalUnits} \times \text{unitSeconds} \times \text{sampleRate})$.
