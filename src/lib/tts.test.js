import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getNpcVoice, isTTSSupported, speak, stopSpeaking, isSpeaking } from './tts.js'

describe('getNpcVoice', () => {
  const NPC_VOICES = ['echo', 'fable', 'alloy', 'nova', 'shimmer']

  it('returns deterministic voice for same NPC name', () => {
    const voice1 = getNpcVoice('Goblin')
    const voice2 = getNpcVoice('Goblin')
    expect(voice1).toBe(voice2)
  })

  it('uses all voices in NPC_VOICES array', () => {
    const names = [
      'Alice', 'Bob', 'Charlie', 'Diana', 'Eve',
      'Frank', 'Grace', 'Henry', 'Iris', 'Jack',
    ]
    const usedVoices = new Set(names.map(n => getNpcVoice(n)))
    expect(usedVoices.size).toBeGreaterThan(1)
    for (const voice of usedVoices) {
      expect(NPC_VOICES).toContain(voice)
    }
  })

  it('maintains hash consistency across multiple calls', () => {
    const name = 'Orc Chieftain'
    const voices = [getNpcVoice(name), getNpcVoice(name), getNpcVoice(name)]
    expect(voices[0]).toBe(voices[1])
    expect(voices[1]).toBe(voices[2])
  })

  it('handles empty string', () => {
    const voice = getNpcVoice('')
    expect(NPC_VOICES).toContain(voice)
  })

  it('handles null input', () => {
    const voice = getNpcVoice(null)
    expect(NPC_VOICES).toContain(voice)
  })

  it('handles undefined input', () => {
    const voice = getNpcVoice(undefined)
    expect(NPC_VOICES).toContain(voice)
  })

  it('handles special characters in NPC names', () => {
    const names = ['Goblin "King" Joe', "O'Malley", 'Sir-Lancelot', 'NPC#42']
    names.forEach(name => {
      const voice = getNpcVoice(name)
      expect(NPC_VOICES).toContain(voice)
    })
  })

  it('handles very long NPC names', () => {
    const longName = 'A'.repeat(1000)
    const voice = getNpcVoice(longName)
    expect(NPC_VOICES).toContain(voice)
  })

  it('is case sensitive in voice assignment', () => {
    const lower = getNpcVoice('goblin')
    const upper = getNpcVoice('GOBLIN')
    const mixed = getNpcVoice('Goblin')
    expect([lower, upper, mixed].length).toBe(3)
    expect(NPC_VOICES).toContain(lower)
    expect(NPC_VOICES).toContain(upper)
    expect(NPC_VOICES).toContain(mixed)
  })

  it('assigns different voices to different NPCs (deterministically)', () => {
    const voice1 = getNpcVoice('Alice')
    const voice2 = getNpcVoice('Brice')
    const voice3 = getNpcVoice('Charlie')
    const voices = [voice1, voice2, voice3]
    expect(NPC_VOICES).toContain(voice1)
    expect(NPC_VOICES).toContain(voice2)
    expect(NPC_VOICES).toContain(voice3)
  })

  it('voice index is always valid (0-4)', () => {
    const names = [
      'Goblin', 'Orc', 'Elf', 'Dwarf', 'Human',
      'Dragon', 'Wizard', 'Knight', 'Bard', 'Rogue',
    ]
    names.forEach(name => {
      const voice = getNpcVoice(name)
      const index = ['echo', 'fable', 'alloy', 'nova', 'shimmer'].indexOf(voice)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThanOrEqual(4)
    })
  })
})

describe('isTTSSupported', () => {
  it('always returns true', () => {
    expect(isTTSSupported()).toBe(true)
  })

  it('returns boolean type', () => {
    const result = isTTSSupported()
    expect(typeof result).toBe('boolean')
  })
})

describe('speak', () => {
  let mockAudio
  let mockFetch
  let mockSpeechSynthesis

  beforeEach(() => {
    vi.useFakeTimers()

    // Mock Audio
    mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      paused: false,
      onended: null,
      onerror: null,
    }
    global.Audio = vi.fn(() => mockAudio)

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'blob:test')
    global.URL.revokeObjectURL = vi.fn()

    // Mock fetch - default to failing for Pollinations
    mockFetch = vi.fn().mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('pollinations.ai')) {
        return Promise.resolve({ ok: false })
      }
      return Promise.resolve({ ok: false })
    })
    global.fetch = mockFetch

    // Mock AbortController
    global.AbortController = vi.fn(() => ({
      abort: vi.fn(),
      signal: {},
    }))

    // Mock SpeechSynthesisUtterance - must work with 'new' operator
    const mockUtterance = {
      rate: 1,
      pitch: 1,
      volume: 1,
      onstart: null,
      onend: null,
      onerror: null,
    }
    global.SpeechSynthesisUtterance = vi.fn(function(text) {
      return mockUtterance
    })

    // Mock speechSynthesis
    mockSpeechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      speaking: false,
    }
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Basic Behavior', () => {
    it('stops previous audio before playing new text', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })

      await speak('Hello', undefined)
      vi.runAllTimers()

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled()
    })

    it('does nothing when text is empty string', async () => {
      await speak('', undefined)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('does nothing when text is null', async () => {
      await speak(null, undefined)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('does nothing when text is undefined', async () => {
      await speak(undefined, undefined)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('uses default voice onyx when not specified', async () => {
      mockFetch.mockResolvedValue({ ok: false })

      await speak('Test', undefined)

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
    })

    it('uses custom voice option when provided', async () => {
      mockFetch.mockResolvedValue({ ok: false })

      await speak('Test', undefined, { voice: 'nova' })

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
    })

    it('handles undefined onEnd callback', async () => {
      mockFetch.mockResolvedValue({ ok: false })

      await expect(speak('Test', undefined, {})).resolves.toBeUndefined()
    })
  })

  describe('OpenAI TTS Path', () => {
    it('calls fetch with OpenAI API when key provided', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Test', undefined, { openAiKey: 'test-key' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/speech',
        expect.any(Object)
      )
    })

    it('sends correct POST request structure for OpenAI', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Hello', undefined, { openAiKey: 'key', voice: 'nova' })

      const call = mockFetch.mock.calls[0]
      expect(call[1].method).toBe('POST')
      expect(call[1].headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(call[1].body)
      expect(body.model).toBe('tts-1')
      expect(body.input).toBe('Hello')
      expect(body.voice).toBe('nova')
      expect(body.response_format).toBe('mp3')
    })

    it('includes API key in Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Test', undefined, { openAiKey: 'secret-xyz' })

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers.Authorization).toBe('Bearer secret-xyz')
    })

    it('truncates text at 4096 characters for OpenAI', async () => {
      const longText = 'a'.repeat(5000)
      mockFetch.mockResolvedValueOnce({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak(longText, undefined, { openAiKey: 'key' })

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.input.length).toBe(4096)
    })

    it('handles successful OpenAI response with blob', async () => {
      const mockBlob = new Blob(['audio'], { type: 'audio/mpeg' })
      mockBlob.size = 5000

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      })

      const onEnd = vi.fn()
      await speak('Test', onEnd, { openAiKey: 'key' })

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
      expect(global.Audio).toHaveBeenCalled()
    })

    it('rejects small blobs (<1000 bytes)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: vi.fn().mockResolvedValue({
          size: 100,
        }),
      })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Test', undefined, { openAiKey: 'key' })

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
    })

    it('falls through on non-ok HTTP response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400 })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Test', undefined, { openAiKey: 'key' })

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
    })

    it('falls through on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Test', undefined, { openAiKey: 'key' })

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
    })

    it('sets up 15s timeout with AbortController', async () => {
      const abortSpy = vi.fn()
      global.AbortController = vi.fn(() => ({
        abort: abortSpy,
        signal: {},
      }))

      mockFetch.mockImplementationOnce(() => new Promise(() => {}))

      await speak('Test', undefined, { openAiKey: 'key' })
      vi.advanceTimersByTime(15000)

      expect(abortSpy).toHaveBeenCalled()
    })
  })

  describe('Pollinations TTS Path', () => {
    it('calls Pollinations endpoint as fallback', async () => {
      mockFetch.mockImplementationOnce((url) => {
        if (url.includes('openai')) return Promise.resolve({ ok: false })
        if (url.includes('pollinations')) return Promise.resolve({ ok: false })
      })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Test', undefined)

      const calls = mockFetch.mock.calls
      expect(calls.some(c => c[0].includes('pollinations'))).toBe(true)
    })

    it('enforces 15.5s minimum spacing between Pollinations calls', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValue([])

      // First call
      await speak('Test 1', undefined)

      const calls1 = mockFetch.mock.calls.length

      // Advance 10s (less than 15.5s)
      vi.advanceTimersByTime(10000)

      // Second call should wait
      mockFetch.mockClear()
      await speak('Test 2', undefined)
      vi.advanceTimersByTime(5500)

      // Should proceed after waiting
      expect(mockFetch).toHaveBeenCalled()
    })

    it('sends correct Pollinations API request structure', async () => {
      mockFetch.mockImplementationOnce((url) => {
        if (url.includes('openai')) return Promise.resolve({ ok: false })
        if (url.includes('pollinations')) {
          return Promise.resolve({ ok: false })
        }
      })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Hello', undefined, { voice: 'echo' })

      const pollCall = mockFetch.mock.calls.find(c => c[0].includes('pollinations'))
      expect(pollCall).toBeDefined()

      const body = JSON.parse(pollCall[1].body)
      expect(body.model).toBe('tts-1')
      expect(body.input).toBe('Hello')
      expect(body.voice).toBe('echo')
    })

    it('does not include Authorization header for Pollinations', async () => {
      mockFetch.mockImplementationOnce((url) => {
        if (url.includes('openai')) return Promise.resolve({ ok: false })
        if (url.includes('pollinations')) return Promise.resolve({ ok: false })
      })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Test', undefined)

      const pollCall = mockFetch.mock.calls.find(c => c[0].includes('pollinations'))
      expect(pollCall[1].headers.Authorization).toBeUndefined()
    })

    it('truncates text at 4096 characters for Pollinations', async () => {
      const longText = 'b'.repeat(5000)
      mockFetch.mockImplementationOnce((url) => {
        if (url.includes('openai')) return Promise.resolve({ ok: false })
        if (url.includes('pollinations')) return Promise.resolve({ ok: false })
      })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak(longText, undefined)

      const pollCall = mockFetch.mock.calls.find(c => c[0].includes('pollinations'))
      const body = JSON.parse(pollCall[1].body)
      expect(body.input.length).toBe(4096)
    })

    it('handles successful Pollinations blob response', async () => {
      const mockBlob = new Blob(['pollinations audio'], { type: 'audio/mpeg' })
      mockBlob.size = 5000

      mockFetch.mockImplementationOnce((url) => {
        if (url.includes('openai')) return Promise.resolve({ ok: false })
        if (url.includes('pollinations')) {
          return Promise.resolve({
            ok: true,
            blob: vi.fn().mockResolvedValue(mockBlob),
          })
        }
      })

      const onEnd = vi.fn()
      await speak('Test', onEnd)

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
      expect(global.Audio).toHaveBeenCalled()
    })

    it('rejects small Pollinations blobs', async () => {
      mockFetch.mockImplementationOnce((url) => {
        if (url.includes('openai')) return Promise.resolve({ ok: false })
        if (url.includes('pollinations')) {
          return Promise.resolve({
            ok: true,
            blob: vi.fn().mockResolvedValue({ size: 100 }),
          })
        }
      })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Test', undefined)

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
    })

    it('handles 429 rate limit response', async () => {
      mockFetch.mockImplementationOnce((url) => {
        if (url.includes('openai')) return Promise.resolve({ ok: false })
        if (url.includes('pollinations')) {
          return Promise.resolve({ ok: false, status: 429 })
        }
      })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Test', undefined)

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
    })

    it('sets up 12s timeout with AbortController for Pollinations', async () => {
      const abortSpy = vi.fn()
      let abortCallCount = 0
      global.AbortController = vi.fn(() => ({
        abort: vi.fn(() => { abortCallCount++ }),
        signal: {},
      }))

      mockFetch.mockImplementationOnce((url) => {
        if (url.includes('openai')) return Promise.resolve({ ok: false })
        if (url.includes('pollinations')) return new Promise(() => {})
      })

      await speak('Test', undefined)
      vi.advanceTimersByTime(12000)

      expect(abortCallCount).toBeGreaterThan(0)
    })

    it('cleans up blob URL on audio end', async () => {
      const mockBlob = new Blob(['data'], { type: 'audio/mpeg' })
      mockBlob.size = 5000

      mockFetch.mockImplementationOnce((url) => {
        if (url.includes('openai')) return Promise.resolve({ ok: false })
        if (url.includes('pollinations')) {
          return Promise.resolve({
            ok: true,
            blob: vi.fn().mockResolvedValue(mockBlob),
          })
        }
      })

      const onEnd = vi.fn()
      await speak('Test', onEnd)

      mockAudio.onended()

      expect(global.URL.revokeObjectURL).toHaveBeenCalled()
      expect(onEnd).toHaveBeenCalled()
    })
  })

  describe('Web Speech API Path', () => {
    it('falls back to Web Speech when both HTTP APIs fail', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Test', undefined)

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
    })

    it('calls speechSynthesis.getVoices', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Test', undefined)

      expect(mockSpeechSynthesis.getVoices).toHaveBeenCalled()
    })

    it('creates SpeechSynthesisUtterance with text', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Hello world', undefined)

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith('Hello world')
    })

    it('sets rate to 0.85', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])
      const mockUtterance = { rate: 0 }

      await speak('Test', undefined)

      expect(mockUtterance.rate).toBe(0.85)
    })

    it('sets pitch to 0.75', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])
      const mockUtterance = { pitch: 0 }

      await speak('Test', undefined)

      expect(mockUtterance.pitch).toBe(0.75)
    })

    it('sets volume to 1.0', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])
      const mockUtterance = { volume: 0 }

      await speak('Test', undefined)

      expect(mockUtterance.volume).toBe(1)
    })

    it('prefers Google cloud voices', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      const googleVoice = {
        name: 'Google UK English Male',
        lang: 'en-UK',
        localService: false,
      }
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([googleVoice])
      const mockUtterance = { voice: null }

      await speak('Test', undefined)

      expect(mockUtterance.voice).toBe(googleVoice)
    })

    it('filters out bad voices', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      const goodVoice = { name: 'Good Voice', lang: 'en', localService: false }
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([
        { name: 'espeak voice', lang: 'en', localService: false },
        { name: 'festival synth', lang: 'en', localService: false },
        goodVoice,
      ])
      const mockUtterance = { voice: null }

      await speak('Test', undefined)

      expect(mockUtterance.voice).toBe(goodVoice)
    })

    it('sets onEnd callback when provided', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])
      const mockUtterance = { onend: null }

      const onEnd = vi.fn()
      await speak('Test', onEnd)

      expect(mockUtterance.onend).toBe(onEnd)
    })

    it('cancels previous utterance on new speak', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('First', undefined)

      mockSpeechSynthesis.cancel.mockClear()

      await speak('Second', undefined)

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled()
    })
  })

  describe('Fallback Chain', () => {
    it('OpenAI failure → tries Pollinations → tries Web Speech', async () => {
      let callOrder = []
      mockFetch.mockImplementationOnce((url) => {
        if (url.includes('openai')) {
          callOrder.push('openai')
          return Promise.resolve({ ok: false })
        }
        if (url.includes('pollinations')) {
          callOrder.push('pollinations')
          return Promise.resolve({ ok: false })
        }
      })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

      await speak('Test', undefined, { openAiKey: 'key' })

      expect(callOrder).toContain('openai')
      expect(callOrder).toContain('pollinations')
      expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
    })

    it('audio play failures trigger fallback to Web Speech', async () => {
      const mockBlob = new Blob(['audio'], { type: 'audio/mpeg' })
      mockBlob.size = 5000

      mockFetch.mockImplementationOnce((url) => {
        if (url.includes('openai')) return Promise.resolve({ ok: false })
        if (url.includes('pollinations')) {
          return Promise.resolve({
            ok: true,
            blob: vi.fn().mockResolvedValue(mockBlob),
          })
        }
      })

      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])
      mockAudio.play.mockRejectedValueOnce(new Error('Autoplay blocked'))

      const onEnd = vi.fn()
      await speak('Test', onEnd)

      expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalled()
    })

    it('onEnd callback triggered in all paths', async () => {
      const onEnd = vi.fn()
      mockFetch.mockResolvedValue({ ok: false })
      mockSpeechSynthesis.getVoices.mockReturnValueOnce([])
      const mockUtterance = { onend: null }

      await speak('Test', onEnd)

      expect(mockUtterance.onend).toBe(onEnd)
    })
  })
})

describe('stopSpeaking', () => {
  let mockAudio
  let mockSpeechSynthesis

  beforeEach(() => {
    mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      paused: true,
    }
    global.Audio = vi.fn(() => mockAudio)

    mockSpeechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      speaking: false,
    }
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      configurable: true,
    })

    global.fetch = vi.fn(() => Promise.resolve({ ok: false }))
    global.URL.createObjectURL = vi.fn(() => 'blob:test')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('pauses currentAudio if playing', async () => {

    await speak('Test', undefined)
    vi.runAllTimers()

    stopSpeaking()

    expect(mockAudio.pause).toHaveBeenCalled()
  })

  it('calls speechSynthesis.cancel() if available', () => {
    stopSpeaking()

    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled()
  })

  it('safe to call when nothing playing', () => {
    expect(() => stopSpeaking()).not.toThrow()
  })

  it('safe to call multiple times', () => {
    expect(() => {
      stopSpeaking()
      stopSpeaking()
      stopSpeaking()
    }).not.toThrow()
  })
})

describe('isSpeaking', () => {
  let mockAudio
  let mockSpeechSynthesis

  beforeEach(() => {
    vi.useFakeTimers()

    mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      paused: false,
    }
    global.Audio = vi.fn(() => mockAudio)

    mockSpeechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      speaking: false,
    }
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      configurable: true,
    })

    global.fetch = vi.fn(() => Promise.resolve({ ok: false }))
    global.URL.createObjectURL = vi.fn(() => 'blob:test')
    global.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when Audio playing', async () => {
    const mockBlob = new Blob(['audio'], { type: 'audio/mpeg' })
    mockBlob.size = 5000

    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    }))

    mockAudio.paused = false
    await speak('Test', undefined)

    expect(isSpeaking()).toBe(true)
  })

  it('returns false when Audio paused', async () => {
    mockAudio.paused = true
    expect(isSpeaking()).toBe(false)
  })

  it('returns true when speechSynthesis speaking', () => {
    mockSpeechSynthesis.speaking = true
    expect(isSpeaking()).toBe(true)
  })

  it('returns false when both inactive', () => {
    mockAudio.paused = true
    mockSpeechSynthesis.speaking = false
    expect(isSpeaking()).toBe(false)
  })

  it('handles null currentAudio gracefully', () => {
    expect(() => isSpeaking()).not.toThrow()
  })
})

describe('Integration Scenarios', () => {
  let mockAudio
  let mockSpeechSynthesis

  beforeEach(() => {
    vi.useFakeTimers()

    mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      paused: false,
      onended: null,
      onerror: null,
    }
    global.Audio = vi.fn(() => mockAudio)

    global.fetch = vi.fn(() => Promise.resolve({ ok: false }))
    global.URL.createObjectURL = vi.fn(() => 'blob:test')
    global.URL.revokeObjectURL = vi.fn()

    mockSpeechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      speaking: false,
    }
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      configurable: true,
    })

    global.AbortController = vi.fn(() => ({
      abort: vi.fn(),
      signal: {},
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('narrator speaks with default onyx voice', async () => {
    await speak('The adventure begins...', undefined)
    vi.runAllTimers()

    expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
  })

  it('NPC speaks with getNpcVoice(npcName)', async () => {
    const npcName = 'Goblin King'
    const npcVoice = getNpcVoice(npcName)

    await speak('Greetings!', undefined, { voice: npcVoice })
    vi.runAllTimers()

    expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
  })

  it('multiple NPCs sequential dialog', async () => {
    const npc1 = 'Alice'
    const npc2 = 'Bob'

    await speak('Hello!', undefined, { voice: getNpcVoice(npc1) })
    vi.runAllTimers()

    await speak('Hi there!', undefined, { voice: getNpcVoice(npc2) })
    vi.runAllTimers()

    expect(global.SpeechSynthesisUtterance).toHaveBeenCalledTimes(2)
  })

  it('text with special characters', async () => {
    const specialText = 'The Dragon said: "Argh!" It\'s time for battle!'

    await speak(specialText, undefined)
    vi.runAllTimers()

    expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith(specialText)
  })

  it('very long text', async () => {
    const longText = 'Word '.repeat(1000)

    await speak(longText, undefined)
    vi.runAllTimers()

    expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
  })

  it('empty speech followed by normal speech', async () => {
    await speak('', undefined)
    await speak('Now I speak', undefined)
    vi.runAllTimers()

    expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith('Now I speak')
  })

  it('rapid successive speak calls', async () => {
    const promises = [
      speak('First', undefined),
      speak('Second', undefined),
      speak('Third', undefined),
    ]

    await Promise.all(promises)
    vi.runAllTimers()

    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled()
  })

  it('speech interrupted mid-playback', async () => {
    const mockBlob = new Blob(['audio'], { type: 'audio/mpeg' })
    mockBlob.size = 5000

    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    }))

    await speak('Interrupted', undefined)
    stopSpeaking()

    expect(mockAudio.pause).toHaveBeenCalled()
  })

  it('error recovery with fallback', async () => {
    let callCount = 0
    global.fetch.mockImplementationOnce(() => {
      callCount++
      if (callCount < 2) {
        return Promise.reject(new Error('Network'))
      }
      return Promise.resolve({ ok: false })
    })

    mockSpeechSynthesis.getVoices.mockReturnValueOnce([])

    await speak('Test', undefined, { openAiKey: 'key' })
    vi.runAllTimers()

    expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
  })

  it('audio blob URL cleanup prevents memory leak', async () => {
    const mockBlob = new Blob(['audio'], { type: 'audio/mpeg' })
    mockBlob.size = 5000

    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    }))

    const onEnd = vi.fn()
    await speak('Test', onEnd)

    mockAudio.onended()

    expect(global.URL.revokeObjectURL).toHaveBeenCalled()
    expect(onEnd).toHaveBeenCalled()
  })
})

describe('Edge Cases', () => {
  let mockAudio
  let mockSpeechSynthesis

  beforeEach(() => {
    vi.useFakeTimers()

    mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      paused: false,
    }
    global.Audio = vi.fn(() => mockAudio)

    global.fetch = vi.fn(() => Promise.resolve({ ok: false }))
    global.URL.createObjectURL = vi.fn(() => 'blob:test')
    global.URL.revokeObjectURL = vi.fn()

    mockSpeechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      speaking: false,
    }
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      configurable: true,
    })

    global.AbortController = vi.fn(() => ({
      abort: vi.fn(),
      signal: {},
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('undefined options object', async () => {
    await speak('Test', undefined, undefined)
    vi.runAllTimers()

    expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
  })

  it('empty voice string', async () => {
    await speak('Test', undefined, { voice: '' })
    vi.runAllTimers()

    expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
  })

  it('missing onEnd callback', async () => {
    await speak('Test', undefined, {})
    vi.runAllTimers()

    expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
  })

  it('getNpcVoice with numeric-like string names', () => {
    const voice1 = getNpcVoice('123')
    const voice2 = getNpcVoice('456')

    const voices = ['echo', 'fable', 'alloy', 'nova', 'shimmer']
    expect(voices).toContain(voice1)
    expect(voices).toContain(voice2)
  })

  it('speak with whitespace-only text', async () => {
    await speak('   ', undefined)
    vi.runAllTimers()

    expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
  })

  it('stopSpeaking during fallback', async () => {
    const promise = speak('Test', undefined)

    stopSpeaking()

    await promise
    vi.runAllTimers()

    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled()
  })

  it('multiple setTimeouts for rate limiting', async () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

    await speak('Test 1', undefined)
    vi.advanceTimersByTime(20000)

    await speak('Test 2', undefined)
    vi.runAllTimers()

    expect(setTimeoutSpy).toHaveBeenCalled()
  })

  it('API key as non-string type is ignored', async () => {
    await speak('Test', undefined, { openAiKey: 123 })
    vi.runAllTimers()

    expect(global.SpeechSynthesisUtterance).toHaveBeenCalled()
  })

  it('voice field as non-string type is handled', async () => {
    await speak('Test', undefined, { voice: 123 })
    vi.runAllTimers()

    expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
  })
})
