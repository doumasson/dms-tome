import { describe, it, expect } from 'vitest'
import { rleEncode, rleDecode, rleToBlob, blobToRle } from '../../src/lib/rleCodec.js'

describe('rleEncode', () => {
  it('encodes a run of repeated values as [count, value]', () => {
    const data = new Uint16Array([5, 5, 5, 5])
    const encoded = rleEncode(data)
    expect(encoded).toBeInstanceOf(Uint16Array)
    expect(Array.from(encoded)).toEqual([4, 5])
  })

  it('encodes single non-repeated values each as [1, value]', () => {
    const data = new Uint16Array([1, 2, 3])
    const encoded = rleEncode(data)
    expect(Array.from(encoded)).toEqual([1, 1, 1, 2, 1, 3])
  })

  it('encodes mixed runs correctly', () => {
    const data = new Uint16Array([7, 7, 3, 3, 3, 9])
    const encoded = rleEncode(data)
    expect(Array.from(encoded)).toEqual([2, 7, 3, 3, 1, 9])
  })

  it('handles empty input', () => {
    const data = new Uint16Array([])
    const encoded = rleEncode(data)
    expect(Array.from(encoded)).toEqual([])
  })

  it('handles a single value', () => {
    const data = new Uint16Array([42])
    const encoded = rleEncode(data)
    expect(Array.from(encoded)).toEqual([1, 42])
  })

  it('splits runs that exceed Uint16 max (65535) into multiple pairs', () => {
    const count = 65536
    const data = new Uint16Array(count).fill(7)
    const encoded = rleEncode(data)
    // Should produce [65535, 7, 1, 7]
    expect(encoded.length).toBe(4)
    expect(encoded[0]).toBe(65535)
    expect(encoded[1]).toBe(7)
    expect(encoded[2]).toBe(1)
    expect(encoded[3]).toBe(7)
  })
})

describe('rleDecode', () => {
  it('decodes [count, value] pairs back to flat array', () => {
    const encoded = new Uint16Array([4, 5])
    const decoded = rleDecode(encoded, 4)
    expect(decoded).toBeInstanceOf(Uint16Array)
    expect(Array.from(decoded)).toEqual([5, 5, 5, 5])
  })

  it('decodes single-value runs', () => {
    const encoded = new Uint16Array([1, 1, 1, 2, 1, 3])
    const decoded = rleDecode(encoded, 3)
    expect(Array.from(decoded)).toEqual([1, 2, 3])
  })

  it('decodes mixed runs', () => {
    const encoded = new Uint16Array([2, 7, 3, 3, 1, 9])
    const decoded = rleDecode(encoded, 6)
    expect(Array.from(decoded)).toEqual([7, 7, 3, 3, 3, 9])
  })

  it('handles empty encoded input', () => {
    const encoded = new Uint16Array([])
    const decoded = rleDecode(encoded, 0)
    expect(Array.from(decoded)).toEqual([])
  })
})

describe('rleEncode + rleDecode roundtrip', () => {
  it('roundtrips repeated values', () => {
    const original = new Uint16Array([5, 5, 5, 5, 5])
    const encoded = rleEncode(original)
    const decoded = rleDecode(encoded, original.length)
    expect(Array.from(decoded)).toEqual(Array.from(original))
  })

  it('roundtrips single non-repeated values', () => {
    const original = new Uint16Array([1, 2, 3, 4, 5, 6, 7, 8])
    const encoded = rleEncode(original)
    const decoded = rleDecode(encoded, original.length)
    expect(Array.from(decoded)).toEqual(Array.from(original))
  })

  it('roundtrips all-same values (highly compressed)', () => {
    const original = new Uint16Array(1000).fill(99)
    const encoded = rleEncode(original)
    // Should compress to just 2 values
    expect(encoded.length).toBe(2)
    expect(encoded[0]).toBe(1000)
    expect(encoded[1]).toBe(99)
    const decoded = rleDecode(encoded, original.length)
    expect(Array.from(decoded)).toEqual(Array.from(original))
  })

  it('roundtrips a large realistic 80x60 layer with repetitive terrain pattern', () => {
    // Simulate a terrain layer: mostly grass (tile 1), some water (tile 2) strips,
    // some stone (tile 3) patches — representative of real map data
    const width = 80
    const height = 60
    const total = width * height // 4800
    const data = new Uint16Array(total)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (y >= 20 && y < 25) {
          // water strip
          data[idx] = 2
        } else if (x >= 30 && x < 35 && y >= 10 && y < 20) {
          // stone patch
          data[idx] = 3
        } else {
          // grass
          data[idx] = 1
        }
      }
    }

    const encoded = rleEncode(data)
    // Should be significantly smaller than the raw 4800 entries
    expect(encoded.length).toBeLessThan(total)
    // Compression ratio should be at least 10x (encoded pairs << raw entries)
    expect(encoded.length).toBeLessThan(total / 5)

    const decoded = rleDecode(encoded, total)
    expect(decoded.length).toBe(total)
    expect(Array.from(decoded)).toEqual(Array.from(data))
  })
})

describe('rleToBlob and blobToRle', () => {
  it('serializes encoded data to ArrayBuffer', () => {
    const encoded = new Uint16Array([3, 5, 2, 9])
    const buffer = rleToBlob(encoded)
    expect(buffer).toBeInstanceOf(ArrayBuffer)
    // Each Uint16 = 2 bytes, so 4 values = 8 bytes
    expect(buffer.byteLength).toBe(8)
  })

  it('deserializes ArrayBuffer back to Uint16Array', () => {
    const encoded = new Uint16Array([3, 5, 2, 9])
    const buffer = rleToBlob(encoded)
    const result = blobToRle(buffer)
    expect(result).toBeInstanceOf(Uint16Array)
    expect(Array.from(result)).toEqual([3, 5, 2, 9])
  })

  it('roundtrips encode -> blob -> deserialize -> decode', () => {
    const original = new Uint16Array([1, 1, 1, 2, 2, 3, 3, 3, 3, 4])
    const encoded = rleEncode(original)
    const buffer = rleToBlob(encoded)
    const deserialized = blobToRle(buffer)
    const decoded = rleDecode(deserialized, original.length)
    expect(Array.from(decoded)).toEqual(Array.from(original))
  })

  it('handles empty data roundtrip through blob', () => {
    const encoded = new Uint16Array([])
    const buffer = rleToBlob(encoded)
    expect(buffer.byteLength).toBe(0)
    const result = blobToRle(buffer)
    expect(Array.from(result)).toEqual([])
  })
})
