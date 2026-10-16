import { describe, expect, it } from 'vitest';
import { decodeMorse } from '../morse/decode.js';
import { encodeText } from '../morse/encode.js';
import { MORSE_TABLE } from '../morse/table.js';
import { createPrng } from '../prng.js';
import { err, ok } from '../result.js';
import { MAX_ENVELOPE_SAMPLES, renderEnvelope } from './envelope.js';
import { morseToSegments, totalUnits, unitSecondsFromWpm, type Segment } from './segments.js';

describe('morseToSegments', () => {
  it('correctly maps single symbol letters E and T', () => {
    const eSegments = morseToSegments('.');
    expect(eSegments).toEqual(ok([{ on: true, units: 1 }]));
    if (eSegments.ok) {
      expect(totalUnits(eSegments.value)).toBe(1);
    }

    const tSegments = morseToSegments('-');
    expect(tSegments).toEqual(ok([{ on: true, units: 3 }]));
    if (tSegments.ok) {
      expect(totalUnits(tSegments.value)).toBe(3);
    }
  });

  it('matches exact literal segment sequence for SOS (... --- ...)', () => {
    const expectedSosSegments: readonly Segment[] = [
      { on: true, units: 1 },
      { on: false, units: 1 },
      { on: true, units: 1 },
      { on: false, units: 1 },
      { on: true, units: 1 },
      { on: false, units: 3 },
      { on: true, units: 3 },
      { on: false, units: 1 },
      { on: true, units: 3 },
      { on: false, units: 1 },
      { on: true, units: 3 },
      { on: false, units: 3 },
      { on: true, units: 1 },
      { on: false, units: 1 },
      { on: true, units: 1 },
      { on: false, units: 1 },
      { on: true, units: 1 },
    ];

    const result = morseToSegments('... --- ...');
    expect(result).toEqual(ok(expectedSosSegments));
    if (result.ok) {
      expect(totalUnits(result.value)).toBe(27);
    }
  });

  it('delegates grammar validation to decodeMorse and returns identical DecodeErrors', () => {
    // 1. EMPTY_INPUT error
    const emptyInput = '';
    expect(morseToSegments(emptyInput)).toEqual(decodeMorse(emptyInput));
    expect(morseToSegments(emptyInput)).toEqual(err({ code: 'EMPTY_INPUT' }));

    // 2. INVALID_SYMBOL error
    const invalidSymbol = '... # ...';
    expect(morseToSegments(invalidSymbol)).toEqual(decodeMorse(invalidSymbol));
    expect(morseToSegments(invalidSymbol)).toEqual(
      err({ code: 'INVALID_SYMBOL', index: 4, symbol: '#' }),
    );

    // 3. MALFORMED_SEPARATOR error (leading space)
    const malformedLeading = ' ...';
    expect(morseToSegments(malformedLeading)).toEqual(decodeMorse(malformedLeading));
    expect(morseToSegments(malformedLeading)).toEqual(
      err({ code: 'MALFORMED_SEPARATOR', index: 0 }),
    );

    // 4. MALFORMED_SEPARATOR error (double space)
    const malformedDouble = '...  ---';
    expect(morseToSegments(malformedDouble)).toEqual(decodeMorse(malformedDouble));
    expect(morseToSegments(malformedDouble)).toEqual(
      err({ code: 'MALFORMED_SEPARATOR', index: 4 }),
    );

    // 5. UNKNOWN_PATTERN error
    const unknownPattern = '........';
    expect(morseToSegments(unknownPattern)).toEqual(decodeMorse(unknownPattern));
    expect(morseToSegments(unknownPattern)).toEqual(
      err({ code: 'UNKNOWN_PATTERN', index: 0, pattern: '........' }),
    );
  });
});

describe('PARIS standard unit calculations', () => {
  it('verifies PARIS has 43 units and PARIS PARIS has 93 units with independent hand-written arithmetic', () => {
    // Independent manual calculation for "PARIS":
    // P = .--. -> 2 dots (2*1) + 2 dashes (2*3=6) + 3 intra-gaps (3*1=3) = 11 units
    // A = .-   -> 1 dot (1*1)  + 1 dash (1*3=3)   + 1 intra-gap (1*1=1)  = 5 units
    // R = .-.  -> 2 dots (2*1) + 1 dash (1*3=3)   + 2 intra-gaps (2*1=2) = 7 units
    // I = ..   -> 2 dots (2*1) + 0 dashes (0)     + 1 intra-gap (1*1=1)  = 3 units
    // S = ...  -> 3 dots (3*1) + 0 dashes (0)     + 2 intra-gaps (2*1=2) = 5 units
    // 4 inter-letter gaps = 4 * 3 = 12 units
    // Hand-calculated sum = 11 + 5 + 7 + 3 + 5 + 12 = 43 units.
    const expectedParisDots = 2 + 1 + 2 + 2 + 3; // 10
    const expectedParisDashes = 2 + 1 + 1 + 0 + 0; // 4
    const expectedParisIntraGaps = 3 + 1 + 2 + 1 + 2; // 9
    const expectedParisInterLetterGaps = 4; // 4 gaps of 3 units
    const expectedParisWordGaps = 0; // 0
    const handCalculatedParisTotal =
      expectedParisDots * 1 +
      expectedParisDashes * 3 +
      expectedParisIntraGaps * 1 +
      expectedParisInterLetterGaps * 3 +
      expectedParisWordGaps * 7;
    expect(handCalculatedParisTotal).toBe(43);

    const encodedParis = encodeText('PARIS');
    expect(encodedParis.ok).toBe(true);
    if (!encodedParis.ok) return;

    const parisSegmentsResult = morseToSegments(encodedParis.value);
    expect(parisSegmentsResult.ok).toBe(true);
    if (!parisSegmentsResult.ok) return;
    const parisSegments = parisSegmentsResult.value;

    expect(totalUnits(parisSegments)).toBe(43);

    // Verify individual segment breakdown against hand arithmetic
    let dotsCount = 0;
    let dashesCount = 0;
    let intraGapsCount = 0;
    let interLetterGapsCount = 0;
    let wordGapsCount = 0;

    for (const seg of parisSegments) {
      if (seg.on && seg.units === 1) dotsCount++;
      else if (seg.on && seg.units === 3) dashesCount++;
      else if (!seg.on && seg.units === 1) intraGapsCount++;
      else if (!seg.on && seg.units === 3) interLetterGapsCount++;
      else if (!seg.on && seg.units === 7) wordGapsCount++;
    }

    expect(dotsCount).toBe(expectedParisDots);
    expect(dashesCount).toBe(expectedParisDashes);
    expect(intraGapsCount).toBe(expectedParisIntraGaps);
    expect(interLetterGapsCount).toBe(expectedParisInterLetterGaps);
    expect(wordGapsCount).toBe(expectedParisWordGaps);

    // Independent manual calculation for "PARIS PARIS":
    // 2 words of PARIS (43 + 43 = 86 units) + 1 inter-word gap (7 units) = 93 units.
    const expectedTwoWordDots = expectedParisDots * 2; // 20
    const expectedTwoWordDashes = expectedParisDashes * 2; // 8
    const expectedTwoWordIntraGaps = expectedParisIntraGaps * 2; // 18
    const expectedTwoWordInterLetterGaps = expectedParisInterLetterGaps * 2; // 8
    const expectedTwoWordGaps = 1; // 1 word gap of 7 units
    const handCalculatedTwoWordTotal =
      expectedTwoWordDots * 1 +
      expectedTwoWordDashes * 3 +
      expectedTwoWordIntraGaps * 1 +
      expectedTwoWordInterLetterGaps * 3 +
      expectedTwoWordGaps * 7;
    expect(handCalculatedTwoWordTotal).toBe(93);

    const encodedTwoWords = encodeText('PARIS PARIS');
    expect(encodedTwoWords.ok).toBe(true);
    if (!encodedTwoWords.ok) return;

    const twoWordsSegmentsResult = morseToSegments(encodedTwoWords.value);
    expect(twoWordsSegmentsResult.ok).toBe(true);
    if (!twoWordsSegmentsResult.ok) return;
    const twoWordsSegments = twoWordsSegmentsResult.value;

    expect(totalUnits(twoWordsSegments)).toBe(93);

    let twoWordDotsCount = 0;
    let twoWordDashesCount = 0;
    let twoWordIntraGapsCount = 0;
    let twoWordInterLetterGapsCount = 0;
    let twoWordGapsCount = 0;

    for (const seg of twoWordsSegments) {
      if (seg.on && seg.units === 1) twoWordDotsCount++;
      else if (seg.on && seg.units === 3) twoWordDashesCount++;
      else if (!seg.on && seg.units === 1) twoWordIntraGapsCount++;
      else if (!seg.on && seg.units === 3) twoWordInterLetterGapsCount++;
      else if (!seg.on && seg.units === 7) twoWordGapsCount++;
    }

    expect(twoWordDotsCount).toBe(expectedTwoWordDots);
    expect(twoWordDashesCount).toBe(expectedTwoWordDashes);
    expect(twoWordIntraGapsCount).toBe(expectedTwoWordIntraGaps);
    expect(twoWordInterLetterGapsCount).toBe(expectedTwoWordInterLetterGaps);
    expect(twoWordGapsCount).toBe(expectedTwoWordGaps);
  });
});

describe('Segment alternation invariants', () => {
  it('alternates on/off, starts/ends on, and has no zero-length segment for every table character', () => {
    for (const pattern of Object.values(MORSE_TABLE)) {
      const result = morseToSegments(pattern);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;

      const segments = result.value;
      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0]?.on).toBe(true);
      expect(segments[segments.length - 1]?.on).toBe(true);

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        expect(seg?.units).toBeGreaterThan(0);
        if (i > 0) {
          const prev = segments[i - 1];
          expect(seg?.on).not.toBe(prev?.on);
        }
      }
    }
  });

  it('alternates on/off, starts/ends on, and has no zero-length segment for 200 pseudo-random valid strings', () => {
    const prng = createPrng(1234567);
    const alphabet = Object.keys(MORSE_TABLE);

    for (let testIdx = 0; testIdx < 200; testIdx++) {
      const numWords = Math.floor(prng() * 4) + 1; // 1 to 4 words
      const words: string[] = [];
      for (let w = 0; w < numWords; w++) {
        const wordLen = Math.floor(prng() * 8) + 1; // 1 to 8 characters
        let wordStr = '';
        for (let c = 0; c < wordLen; c++) {
          const charIdx = Math.floor(prng() * alphabet.length);
          const ch = alphabet[charIdx];
          if (ch !== undefined) {
            wordStr += ch;
          }
        }
        words.push(wordStr);
      }
      const rawText = words.join(' ');
      const encoded = encodeText(rawText);
      expect(encoded.ok).toBe(true);
      if (!encoded.ok) continue;

      const segResult = morseToSegments(encoded.value);
      expect(segResult.ok).toBe(true);
      if (!segResult.ok) continue;

      const segments = segResult.value;
      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0]?.on).toBe(true);
      expect(segments[segments.length - 1]?.on).toBe(true);

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        expect(seg?.units).toBeGreaterThan(0);
        if (i > 0) {
          const prev = segments[i - 1];
          expect(seg?.on).not.toBe(prev?.on);
        }
      }
    }
  });
});

describe('unitSecondsFromWpm', () => {
  it('correctly calculates unitSeconds for standard speeds', () => {
    const res12 = unitSecondsFromWpm(12);
    expect(res12.ok).toBe(true);
    if (res12.ok) {
      expect(res12.value).toBeCloseTo(0.1, 6);
    }

    const res20 = unitSecondsFromWpm(20);
    expect(res20.ok).toBe(true);
    if (res20.ok) {
      expect(res20.value).toBeCloseTo(0.06, 6);
    }
  });

  it('accepts boundary speeds 5 and 60 WPM', () => {
    const minWpm = unitSecondsFromWpm(5);
    expect(minWpm.ok).toBe(true);
    if (minWpm.ok) {
      expect(minWpm.value).toBeCloseTo(0.24, 6);
    }

    const maxWpm = unitSecondsFromWpm(60);
    expect(maxWpm.ok).toBe(true);
    if (maxWpm.ok) {
      expect(maxWpm.value).toBeCloseTo(0.02, 6);
    }
  });

  it('rejects speeds outside [5, 60] and non-finite values with INVALID_WPM', () => {
    expect(unitSecondsFromWpm(4.99)).toEqual(err({ code: 'INVALID_WPM' }));
    expect(unitSecondsFromWpm(60.01)).toEqual(err({ code: 'INVALID_WPM' }));
    expect(unitSecondsFromWpm(0)).toEqual(err({ code: 'INVALID_WPM' }));
    expect(unitSecondsFromWpm(-1)).toEqual(err({ code: 'INVALID_WPM' }));
    expect(unitSecondsFromWpm(NaN)).toEqual(err({ code: 'INVALID_WPM' }));
    expect(unitSecondsFromWpm(Infinity)).toEqual(err({ code: 'INVALID_WPM' }));
    expect(unitSecondsFromWpm(-Infinity)).toEqual(err({ code: 'INVALID_WPM' }));
  });
});

describe('renderEnvelope', () => {
  it('renders "E" at 20 WPM and sampleRate 8000 as exactly 480 samples, all 1', () => {
    const segsResult = morseToSegments('.');
    expect(segsResult.ok).toBe(true);
    if (!segsResult.ok) return;

    const envelopeResult = renderEnvelope(segsResult.value, {
      unitSeconds: 0.06,
      sampleRate: 8000,
    });
    expect(envelopeResult.ok).toBe(true);
    if (!envelopeResult.ok) return;

    const envelope = envelopeResult.value;
    expect(envelope.length).toBe(480);
    for (let i = 0; i < envelope.length; i++) {
      expect(envelope[i]).toBe(1.0);
    }
  });

  it('renders "T" at 20 WPM and sampleRate 8000 as exactly 1440 samples, all 1', () => {
    const segsResult = morseToSegments('-');
    expect(segsResult.ok).toBe(true);
    if (!segsResult.ok) return;

    const envelopeResult = renderEnvelope(segsResult.value, {
      unitSeconds: 0.06,
      sampleRate: 8000,
    });
    expect(envelopeResult.ok).toBe(true);
    if (!envelopeResult.ok) return;

    const envelope = envelopeResult.value;
    expect(envelope.length).toBe(1440);
    for (let i = 0; i < envelope.length; i++) {
      expect(envelope[i]).toBe(1.0);
    }
  });

  it('renders "SOS" at 12 WPM and 8000 Hz with exact sample index of every on/off transition', () => {
    // 12 WPM -> unitSeconds = 0.1 s.
    // sampleRate = 8000 Hz -> samples per unit = 800 samples.
    // Hand-computed boundaries:
    // Seg 0 (S dot 1, on 1 unit):   [0, 800)       val: 1
    // Seg 1 (intra gap, off 1 unit):[800, 1600)    val: 0
    // Seg 2 (S dot 2, on 1 unit):   [1600, 2400)   val: 1
    // Seg 3 (intra gap, off 1 unit):[2400, 3200)   val: 0
    // Seg 4 (S dot 3, on 1 unit):   [3200, 4000)   val: 1
    // Seg 5 (letter gap, off 3 u):  [4000, 6400)   val: 0
    // Seg 6 (O dash 1, on 3 u):     [6400, 8800)   val: 1
    // Seg 7 (intra gap, off 1 unit):[8800, 9600)   val: 0
    // Seg 8 (O dash 2, on 3 u):     [9600, 12000)  val: 1
    // Seg 9 (intra gap, off 1 unit):[12000, 12800) val: 0
    // Seg 10 (O dash 3, on 3 u):    [12800, 15200) val: 1
    // Seg 11 (letter gap, off 3 u): [15200, 17600) val: 0
    // Seg 12 (S dot 1, on 1 unit):  [17600, 18400) val: 1
    // Seg 13 (intra gap, off 1 u):  [18400, 19200) val: 0
    // Seg 14 (S dot 2, on 1 unit):  [19200, 20000) val: 1
    // Seg 15 (intra gap, off 1 u):  [20000, 20800) val: 0
    // Seg 16 (S dot 3, on 1 unit):  [20800, 21600) val: 1
    const segsResult = morseToSegments('... --- ...');
    expect(segsResult.ok).toBe(true);
    if (!segsResult.ok) return;

    const envelopeResult = renderEnvelope(segsResult.value, {
      unitSeconds: 0.1,
      sampleRate: 8000,
    });
    expect(envelopeResult.ok).toBe(true);
    if (!envelopeResult.ok) return;

    const envelope = envelopeResult.value;
    expect(envelope.length).toBe(21600);

    // Assert exact transitions
    const expectedTransitions = [
      800, 1600, 2400, 3200, 4000, 6400, 8800, 9600, 12000, 12800, 15200, 17600, 18400, 19200,
      20000, 20800,
    ];

    const actualTransitions: number[] = [];
    for (let i = 1; i < envelope.length; i++) {
      if (envelope[i] !== envelope[i - 1]) {
        actualTransitions.push(i);
      }
    }
    expect(actualTransitions).toEqual(expectedTransitions);

    // Verify key boundary sample values directly
    expect(envelope[0]).toBe(1.0);
    expect(envelope[799]).toBe(1.0);
    expect(envelope[800]).toBe(0.0);
    expect(envelope[1599]).toBe(0.0);
    expect(envelope[1600]).toBe(1.0);
    expect(envelope[3999]).toBe(1.0);
    expect(envelope[4000]).toBe(0.0);
    expect(envelope[6399]).toBe(0.0);
    expect(envelope[6400]).toBe(1.0);
    expect(envelope[8799]).toBe(1.0);
    expect(envelope[8800]).toBe(0.0);
    expect(envelope[21599]).toBe(1.0);
  });

  it('guarantees drift-free cumulative boundary rounding with non-integer samples-per-unit', () => {
    // 13 WPM at 8000 Hz:
    // unitSeconds = 1.2 / 13 = 0.0923076923...
    // samples per unit = (1.2 / 13) * 8000 = 738.461538... (non-integer)
    const segsResult = morseToSegments('... --- ...');
    expect(segsResult.ok).toBe(true);
    if (!segsResult.ok) return;

    const segments = segsResult.value;
    const unitSecs = 1.2 / 13;
    const sampleRate = 8000;
    const total = totalUnits(segments); // 27
    const expectedExactLength = Math.round(total * unitSecs * sampleRate); // Math.round(19938.4615) = 19938

    const envelopeResult = renderEnvelope(segments, {
      unitSeconds: unitSecs,
      sampleRate,
    });
    expect(envelopeResult.ok).toBe(true);
    if (!envelopeResult.ok) return;

    const envelope = envelopeResult.value;
    expect(envelope.length).toBe(expectedExactLength);
    expect(envelope.length).toBe(19938);
    // Last sample in the exact allocation must be 1.0 (since SOS ends on an active dot)
    expect(envelope[expectedExactLength - 1]).toBe(1.0);

    // Demonstrate and verify that naive per-segment rounding causes cumulative drift:
    // 12 segments of 1 unit: 12 * Math.round(738.46) = 12 * 738 = 8856
    // 5 segments of 3 units: 5 * Math.round(2215.38) = 5 * 2215 = 11075
    // Naive sum = 19931, which drifts by 7 samples from the true total of 19938
    let naiveDriftedLength = 0;
    for (const seg of segments) {
      naiveDriftedLength += Math.round(seg.units * unitSecs * sampleRate);
    }
    expect(naiveDriftedLength).toBe(19931);
    expect(envelope.length).not.toBe(naiveDriftedLength);

    // Also verify intermediate cumulative boundaries strictly match Math.round(cumulativeUnits * unitSecs * sampleRate)
    let cumulativeUnits = 0;
    let prevBoundary = 0;
    for (const seg of segments) {
      cumulativeUnits += seg.units;
      const expectedBoundary = Math.round(cumulativeUnits * unitSecs * sampleRate);
      // Samples inside this segment must equal expected value
      for (let s = prevBoundary; s < expectedBoundary; s++) {
        expect(envelope[s]).toBe(seg.on ? 1.0 : 0.0);
      }
      prevBoundary = expectedBoundary;
    }
    expect(prevBoundary).toBe(expectedExactLength);
  });

  it('rejects invalid parameters on every error path', () => {
    const validSegments: readonly Segment[] = [{ on: true, units: 1 }];

    // Empty segments list
    expect(renderEnvelope([], { unitSeconds: 0.1, sampleRate: 8000 })).toEqual(
      err({ code: 'INVALID_PARAMETER', parameter: 'segments' }),
    );

    // Invalid unitSeconds
    expect(renderEnvelope(validSegments, { unitSeconds: 0, sampleRate: 8000 })).toEqual(
      err({ code: 'INVALID_PARAMETER', parameter: 'unitSeconds' }),
    );

    expect(renderEnvelope(validSegments, { unitSeconds: -0.1, sampleRate: 8000 })).toEqual(
      err({ code: 'INVALID_PARAMETER', parameter: 'unitSeconds' }),
    );

    expect(renderEnvelope(validSegments, { unitSeconds: NaN, sampleRate: 8000 })).toEqual(
      err({ code: 'INVALID_PARAMETER', parameter: 'unitSeconds' }),
    );

    expect(
      renderEnvelope(validSegments, {
        unitSeconds: Infinity,
        sampleRate: 8000,
      }),
    ).toEqual(err({ code: 'INVALID_PARAMETER', parameter: 'unitSeconds' }));

    // Invalid sampleRate
    expect(renderEnvelope(validSegments, { unitSeconds: 0.1, sampleRate: 999 })).toEqual(
      err({ code: 'INVALID_PARAMETER', parameter: 'sampleRate' }),
    );

    expect(
      renderEnvelope(validSegments, {
        unitSeconds: 0.1,
        sampleRate: 192001,
      }),
    ).toEqual(err({ code: 'INVALID_PARAMETER', parameter: 'sampleRate' }));

    expect(
      renderEnvelope(validSegments, {
        unitSeconds: 0.1,
        sampleRate: 8000.5,
      }),
    ).toEqual(err({ code: 'INVALID_PARAMETER', parameter: 'sampleRate' }));

    expect(renderEnvelope(validSegments, { unitSeconds: 0.1, sampleRate: 0 })).toEqual(
      err({ code: 'INVALID_PARAMETER', parameter: 'sampleRate' }),
    );

    expect(
      renderEnvelope(validSegments, {
        unitSeconds: 0.1,
        sampleRate: -8000,
      }),
    ).toEqual(err({ code: 'INVALID_PARAMETER', parameter: 'sampleRate' }));

    // Pre-allocation check: TOO_LONG when exceeding MAX_ENVELOPE_SAMPLES
    // 60,000 units * 1.0 s * 1000 Hz = 60,000,000 samples > 50,000,000
    const longSegments: readonly Segment[] = [{ on: true, units: 60_000 }];
    expect(renderEnvelope(longSegments, { unitSeconds: 1.0, sampleRate: 1000 })).toEqual(
      err({ code: 'TOO_LONG' }),
    );
    expect(MAX_ENVELOPE_SAMPLES).toBe(50_000_000);
  });
});
