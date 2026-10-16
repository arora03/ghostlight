/**
 * Core library version string.
 */
export const VERSION: string = '0.0.0';

export { err, ok, type Result } from './result.js';

export { MORSE_TABLE, REVERSE_MORSE_TABLE } from './morse/table.js';

export {
  encodeText,
  type EmptyMessageError,
  type EncodeError,
  type UnsupportedCharacter,
  type UnsupportedCharactersError,
} from './morse/encode.js';

export {
  decodeMorse,
  type DecodeError,
  type EmptyInputError,
  type InvalidSymbolError,
  type MalformedSeparatorError,
  type UnknownPatternError,
} from './morse/decode.js';
