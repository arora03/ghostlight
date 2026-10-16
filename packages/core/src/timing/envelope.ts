import { err, ok, type Result } from '../result.js';
import { totalUnits, type Segment } from './segments.js';

/**
 * Maximum allowed sample count before buffer allocation (50 million samples).
 */
export const MAX_ENVELOPE_SAMPLES = 50_000_000;

/**
 * Error returned when an input parameter fails validation.
 */
export interface InvalidParameterError {
  readonly code: 'INVALID_PARAMETER';
  readonly parameter: string;
}

/**
 * Error returned when the requested envelope buffer would exceed the maximum sample limit.
 */
export interface TooLongError {
  readonly code: 'TOO_LONG';
}

/**
 * Union of possible errors encountered while rendering a timing envelope.
 */
export type EnvelopeError = InvalidParameterError | TooLongError;

/**
 * Configuration parameters for envelope rendering.
 */
export interface EnvelopeParams {
  readonly unitSeconds: number;
  readonly sampleRate: number;
}

/**
 * Renders an alternating sequence of Morse timing segments into a discrete-time sample buffer (Float32Array).
 *
 * Characteristics:
 * - Hard keying: 1.0 for "on" segments, 0.0 for "off" segments, with instantaneous transitions (no ramps).
 * - Drift-free cumulative rounding: sample boundaries are derived from the cumulative unit count
 *   `boundarySample = Math.round(cumulativeUnits * unitSeconds * sampleRate)`.
 *   Segment k fills the sample interval `[boundary(k-1), boundary(k))`.
 * - Pre-allocation length bounds check: returns `TOO_LONG` before allocating if sample count > 50,000,000.
 *
 * @param segments - Sequence of timing segments. Must be non-empty.
 * @param params - Timing parameters specifying unitSeconds (> 0, finite) and sampleRate (integer, 1000..192000).
 * @returns A Result containing the Float32Array envelope on success, or an EnvelopeError on failure.
 */
export function renderEnvelope(
  segments: readonly Segment[],
  params: EnvelopeParams,
): Result<Float32Array, EnvelopeError> {
  if (segments.length === 0) {
    return err({ code: 'INVALID_PARAMETER', parameter: 'segments' });
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg === undefined || !Number.isFinite(seg.units) || seg.units <= 0) {
      return err({ code: 'INVALID_PARAMETER', parameter: 'segments' });
    }
  }

  if (!Number.isFinite(params.unitSeconds) || params.unitSeconds <= 0) {
    return err({ code: 'INVALID_PARAMETER', parameter: 'unitSeconds' });
  }

  if (
    !Number.isInteger(params.sampleRate) ||
    params.sampleRate < 1000 ||
    params.sampleRate > 192000
  ) {
    return err({ code: 'INVALID_PARAMETER', parameter: 'sampleRate' });
  }

  const total = totalUnits(segments);
  const totalSamples = Math.round(total * params.unitSeconds * params.sampleRate);

  if (totalSamples > MAX_ENVELOPE_SAMPLES) {
    return err({ code: 'TOO_LONG' });
  }

  const envelope = new Float32Array(totalSamples);
  let cumulativeUnits = 0;
  let prevBoundary = 0;

  for (let k = 0; k < segments.length; k++) {
    const seg = segments[k];
    if (seg === undefined) {
      continue;
    }
    cumulativeUnits += seg.units;
    const boundarySample = Math.round(cumulativeUnits * params.unitSeconds * params.sampleRate);

    if (seg.on) {
      envelope.fill(1.0, prevBoundary, boundarySample);
    }
    prevBoundary = boundarySample;
  }

  return ok(envelope);
}
