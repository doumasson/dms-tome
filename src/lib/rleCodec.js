/**
 * RLE Codec for tile layer compression.
 *
 * Encoded format: [count, value, count, value, ...]
 * Both count and value are Uint16 (0–65535).
 * Runs longer than 65535 are split into multiple pairs.
 */

const MAX_RUN = 65535

/**
 * Encode a Uint16Array using run-length encoding.
 * @param {Uint16Array} data
 * @returns {Uint16Array} encoded pairs [count, value, ...]
 */
export function rleEncode(data) {
  if (data.length === 0) return new Uint16Array(0)

  // Use a plain array during building to avoid repeated allocations
  const pairs = []
  let i = 0

  while (i < data.length) {
    const value = data[i]
    let runLength = 1

    while (i + runLength < data.length && data[i + runLength] === value) {
      runLength++
    }

    // Split runs that exceed Uint16 max
    let remaining = runLength
    while (remaining > MAX_RUN) {
      pairs.push(MAX_RUN, value)
      remaining -= MAX_RUN
    }
    pairs.push(remaining, value)

    i += runLength
  }

  return new Uint16Array(pairs)
}

/**
 * Decode RLE-encoded Uint16Array back to the original flat array.
 * @param {Uint16Array} encoded
 * @param {number} expectedLength  Total number of values in the original array
 * @returns {Uint16Array}
 */
export function rleDecode(encoded, expectedLength) {
  if (encoded.length === 0) return new Uint16Array(0)

  const result = new Uint16Array(expectedLength)
  let pos = 0

  for (let i = 0; i < encoded.length; i += 2) {
    const count = encoded[i]
    const value = encoded[i + 1]
    result.fill(value, pos, pos + count)
    pos += count
  }

  return result
}

/**
 * Serialize a Uint16Array to a raw ArrayBuffer (little-endian Uint16 values).
 * @param {Uint16Array} encoded
 * @returns {ArrayBuffer}
 */
export function rleToBlob(encoded) {
  // Uint16Array.buffer may have extra space if it was a slice — copy to own buffer
  const buffer = new ArrayBuffer(encoded.length * 2)
  new Uint16Array(buffer).set(encoded)
  return buffer
}

/**
 * Deserialize a raw ArrayBuffer back to a Uint16Array.
 * @param {ArrayBuffer} buffer
 * @returns {Uint16Array}
 */
export function blobToRle(buffer) {
  return new Uint16Array(buffer)
}
