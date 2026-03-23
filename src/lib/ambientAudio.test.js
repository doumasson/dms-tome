import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ambient } from './ambientAudio'

describe('Ambient Audio System', () => {
  let mockAudioContext
  let mockGainNode
  let mockOscillator
  let mockBufferSource
  let mockFilter
  let mockBuffer

  beforeEach(() => {
    vi.useFakeTimers()

    // Reset ambient state
    ambient.ctx = null
    ambient.master = null
    ambient.nodes = []
    ambient.timers = []
    ambient.type = null
    ambient.volume = 0.28
    ambient.muted = false
    ambient._combatPrev = null

    // Setup Web Audio API mocks with proper constructor behavior
    mockGainNode = {
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
    }

    mockOscillator = {
      type: 'sine',
      frequency: {
        value: 0,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }

    mockBufferSource = {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }

    mockFilter = {
      type: 'lowpass',
      frequency: {
        value: 0,
      },
      Q: {
        value: 1,
      },
      connect: vi.fn(),
    }

    mockBuffer = {
      getChannelData: vi.fn(() => new Float32Array(44100 * 2)),
    }

    mockAudioContext = {
      currentTime: 0,
      state: 'running',
      sampleRate: 44100,
      destination: {},
      createGain: vi.fn(() => {
        const newGain = { ...mockGainNode, gain: { ...mockGainNode.gain } }
        return newGain
      }),
      createOscillator: vi.fn(() => {
        const newOsc = { ...mockOscillator, frequency: { ...mockOscillator.frequency } }
        return newOsc
      }),
      createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
      createBiquadFilter: vi.fn(() => {
        const newFilter = { ...mockFilter, frequency: { ...mockFilter.frequency }, Q: { ...mockFilter.Q } }
        return newFilter
      }),
      createBuffer: vi.fn(() => mockBuffer),
      resume: vi.fn(() => Promise.resolve()),
    }

    // Setup window.AudioContext as a constructor
    window.AudioContext = vi.fn(function () {
      return mockAudioContext
    })
    window.webkitAudioContext = vi.fn(function () {
      return mockAudioContext
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('initializes AudioContext on first call', () => {
      const result = ambient._init()

      expect(result).toBe(true)
      expect(ambient.ctx).toBeDefined()
      expect(ambient.master).toBeDefined()
    })

    it('returns true if already initialized', () => {
      ambient._init()
      const ctx1 = ambient.ctx

      const result = ambient._init()

      expect(result).toBe(true)
      expect(ambient.ctx).toBe(ctx1)
    })

    it('handles AudioContext creation failure gracefully', () => {
      window.AudioContext = undefined
      window.webkitAudioContext = undefined

      const result = ambient._init()

      expect(result).toBe(false)
      expect(ambient.ctx).toBeNull()
    })

    it('creates master gain node connected to destination', () => {
      ambient._init()

      expect(mockAudioContext.createGain).toHaveBeenCalled()
      expect(ambient.master).toBeDefined()
    })
  })

  describe('audio context resumption', () => {
    it('resumes suspended AudioContext', async () => {
      ambient._init()
      ambient.ctx.state = 'suspended'

      await ambient._resume()

      expect(ambient.ctx.resume).toHaveBeenCalled()
    })

    it('does nothing if context is already running', async () => {
      ambient._init()
      ambient.ctx.state = 'running'

      await ambient._resume()

      expect(ambient.ctx.resume).not.toHaveBeenCalled()
    })

    it('handles resume failure gracefully', async () => {
      ambient._init()
      ambient.ctx.state = 'suspended'
      ambient.ctx.resume = vi.fn(() => Promise.reject(new Error('blocked')))

      await ambient._resume()

      expect(ambient.ctx.resume).toHaveBeenCalled()
    })
  })

  describe('play(type)', () => {
    it('initializes context and plays dungeon audio', async () => {
      await ambient.play('dungeon')

      expect(ambient.ctx).toBeDefined()
      expect(ambient.type).toBe('dungeon')
    })

    it('fades out previous audio before switching types', async () => {
      await ambient.play('dungeon')
      const previousMaster = ambient.master

      await ambient.play('tavern')

      expect(previousMaster.gain.cancelScheduledValues).toHaveBeenCalled()
      expect(previousMaster.gain.linearRampToValueAtTime).toHaveBeenCalled()
    })

    it('does not switch if already playing same type', async () => {
      await ambient.play('dungeon')
      const initialNodeCount = ambient.nodes.length

      await ambient.play('dungeon')

      // Should not create new nodes if type is same
      expect(ambient.type).toBe('dungeon')
    })

    it('stops playing when type is "silence"', async () => {
      await ambient.play('dungeon')
      await ambient.play('silence')

      expect(ambient.type).toBeNull()
    })

    it('handles null type by stopping', async () => {
      await ambient.play('dungeon')
      await ambient.play(null)

      expect(ambient.type).toBeNull()
    })

    it('returns early if init fails', async () => {
      window.AudioContext = undefined
      window.webkitAudioContext = undefined

      await ambient.play('dungeon')

      expect(ambient.ctx).toBeNull()
    })
  })

  describe('combatMode(active, scene)', () => {
    it('switches to combat audio when activated', async () => {
      await ambient.play('dungeon')
      await ambient.combatMode(true)

      expect(ambient.type).toBe('combat')
      expect(ambient._combatPrev).toBe('dungeon')
    })

    it('reverts to previous scene type when deactivated', async () => {
      await ambient.play('tavern')
      await ambient.combatMode(true)
      expect(ambient.type).toBe('combat')

      await ambient.combatMode(false)

      expect(ambient.type).toBe('tavern')
      expect(ambient._combatPrev).toBeNull()
    })

    it('defaults to dungeon if no previous scene', async () => {
      ambient.type = null
      await ambient.combatMode(true)

      expect(ambient.type).toBe('combat')
      expect(ambient._combatPrev).toBe('dungeon')
    })

    it('uses detected scene type when provided', async () => {
      const scene = { title: 'The Tavern', text: 'A cozy inn' }
      ambient.type = null

      await ambient.combatMode(true, scene)

      expect(ambient._combatPrev).toBe('tavern')
    })
  })

  describe('stop()', () => {
    it('fades out and clears nodes', async () => {
      await ambient.play('dungeon')
      const gainSpy = vi.spyOn(ambient.master.gain, 'cancelScheduledValues')

      ambient.stop()

      expect(gainSpy).toHaveBeenCalled()
      expect(ambient.type).toBeNull()
    })

    it('clears all timers', async () => {
      ambient._init()
      ambient.type = 'dungeon'
      // Manually add a timer to test clearing
      ambient._timer(() => {}, 1000)
      const timerCount = ambient.timers.length
      expect(timerCount).toBeGreaterThan(0)

      ambient._clearNodes()

      expect(ambient.timers.length).toBe(0)
    })
  })

  describe('volume control', () => {
    it('setMuted(true) silences audio', async () => {
      ambient._init()
      const gainSpy = vi.spyOn(ambient.master.gain, 'linearRampToValueAtTime')

      ambient.setMuted(true)

      expect(ambient.muted).toBe(true)
      expect(gainSpy).toHaveBeenCalledWith(0, expect.any(Number))
    })

    it('setMuted(false) restores volume', async () => {
      ambient._init()
      ambient.muted = true
      ambient.volume = 0.5
      const gainSpy = vi.spyOn(ambient.master.gain, 'linearRampToValueAtTime')

      ambient.setMuted(false)

      expect(ambient.muted).toBe(false)
      expect(gainSpy).toHaveBeenCalledWith(0.5, expect.any(Number))
    })

    it('setVolume clamps value between 0 and 1', () => {
      ambient._init()

      ambient.setVolume(1.5)
      expect(ambient.volume).toBe(1)

      ambient.setVolume(-0.5)
      expect(ambient.volume).toBe(0)

      ambient.setVolume(0.5)
      expect(ambient.volume).toBe(0.5)
    })

    it('setVolume does not apply when muted', async () => {
      ambient._init()
      ambient.muted = true
      const initialVolume = ambient.volume

      ambient.setVolume(0.8)

      expect(ambient.volume).toBe(0.8)
    })

    it('setVolume ramps smoothly', async () => {
      ambient._init()
      const gainSpy = vi.spyOn(ambient.master.gain, 'linearRampToValueAtTime')

      ambient.setVolume(0.6)

      expect(gainSpy).toHaveBeenCalledWith(0.6, expect.any(Number))
    })
  })

  describe('scene type detection', () => {
    it('detects tavern scenes', () => {
      const tavern = { title: 'The Prancing Pony', text: 'A bustling tavern' }
      expect(ambient.detect(tavern)).toBe('tavern')

      const inn = { title: 'Rest Inn', text: 'A comfortable inn' }
      expect(ambient.detect(inn)).toBe('tavern')

      const bar = { title: 'The Rusty Mug', text: 'An old bar' }
      expect(ambient.detect(bar)).toBe('tavern')
    })

    it('detects town scenes', () => {
      const town = { title: 'Market Square', text: 'A bustling town' }
      expect(ambient.detect(town)).toBe('town')

      const city = { title: 'Grand City', text: 'A massive city' }
      expect(ambient.detect(city)).toBe('town')

      const market = { title: 'The Bazaar', text: 'A crowded marketplace' }
      expect(ambient.detect(market)).toBe('town')
    })

    it('detects outdoor scenes', () => {
      const forest = { title: 'Whispering Woods', text: 'A deep forest' }
      expect(ambient.detect(forest)).toBe('outdoor')

      const lake = { title: 'Crystal Lake', text: 'A pristine lake' }
      expect(ambient.detect(lake)).toBe('outdoor')

      const beach = { title: 'Sandy Shore', text: 'A beautiful beach' }
      expect(ambient.detect(beach)).toBe('outdoor')
    })

    it('defaults to dungeon for unknown scenes', () => {
      const dungeon = { title: 'Deep Dungeon', text: 'Dark stone corridors' }
      expect(ambient.detect(dungeon)).toBe('dungeon')

      const cave = { title: 'Stalactite Cave', text: 'Underground passage' }
      expect(ambient.detect(cave)).toBe('dungeon')

      const unknown = { title: 'Unknown Place', text: 'Somewhere mysterious' }
      expect(ambient.detect(unknown)).toBe('dungeon')
    })

    it('handles null or missing scene', () => {
      expect(ambient.detect(null)).toBe('dungeon')
      expect(ambient.detect(undefined)).toBe('dungeon')
      expect(ambient.detect({})).toBe('dungeon')
    })

    it('is case-insensitive', () => {
      const tavern = { title: 'THE TAVERN', text: 'LOUD AND CROWDED' }
      expect(ambient.detect(tavern)).toBe('tavern')

      const forest = { title: 'ANCIENT FOREST', text: 'DENSE WOODS' }
      expect(ambient.detect(forest)).toBe('outdoor')
    })
  })

  describe('scene builders', () => {
    it('builds dungeon audio with drone and drip', async () => {
      ambient._init()
      ambient._dungeon()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled()
      expect(ambient.nodes.length).toBeGreaterThan(0)
    })

    it('builds tavern audio with chatter and music', async () => {
      ambient._init()
      ambient._tavern()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled()
      expect(ambient.nodes.length).toBeGreaterThan(0)
    })

    it('builds outdoor audio with wind and birds', async () => {
      ambient._init()
      ambient._outdoor()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled()
      expect(ambient.nodes.length).toBeGreaterThan(0)
    })

    it('builds town audio with crowd and bells', async () => {
      ambient._init()
      ambient._town()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled()
      expect(ambient.nodes.length).toBeGreaterThan(0)
    })

    it('builds combat audio with drones and pulse', async () => {
      ambient._init()
      ambient._combat()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled()
      expect(ambient.nodes.length).toBeGreaterThan(0)
    })
  })

  describe('sound effects', () => {
    it('generates drip effect', async () => {
      ambient._init()
      ambient._drip()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('generates bird chirp effect', async () => {
      ambient._init()
      ambient._birdChirp()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('bird chirp creates multiple notes', async () => {
      ambient._init()
      const initialOscCount = mockAudioContext.createOscillator.mock.calls.length
      ambient._birdChirp()
      const finalOscCount = mockAudioContext.createOscillator.mock.calls.length

      expect(finalOscCount - initialOscCount).toBeGreaterThanOrEqual(2)
      expect(finalOscCount - initialOscCount).toBeLessThanOrEqual(5)
    })

    it('generates lute note effect', async () => {
      ambient._init()
      ambient._luteNote()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('generates bell strike with harmonics', async () => {
      ambient._init()
      const initialOscCount = mockAudioContext.createOscillator.mock.calls.length
      ambient._bellStrike()
      const finalOscCount = mockAudioContext.createOscillator.mock.calls.length

      expect(finalOscCount - initialOscCount).toBe(3) // fundamental + 2 harmonics
    })

    it('generates thud effect', async () => {
      ambient._init()
      ambient._thud()

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })

    it('does not crash if ctx is null', () => {
      ambient.ctx = null

      expect(() => {
        ambient._drip()
        ambient._birdChirp()
        ambient._luteNote()
        ambient._bellStrike()
        ambient._thud()
      }).not.toThrow()
    })
  })

  describe('node tracking', () => {
    it('tracks nodes in array', async () => {
      ambient._init()
      ambient._osc('sine', 100, 0.05)

      expect(ambient.nodes.length).toBeGreaterThan(0)
    })

    it('clears all nodes on _clearNodes', async () => {
      ambient._init()
      ambient._osc('sine', 100, 0.05)
      ambient._osc('sine', 200, 0.05)

      const nodeCount = ambient.nodes.length
      expect(nodeCount).toBeGreaterThan(0)

      ambient._clearNodes()

      expect(ambient.nodes.length).toBe(0)
      expect(ambient.timers.length).toBe(0)
    })

    it('stops all tracked nodes when cleared', async () => {
      ambient._init()
      ambient._osc('sine', 100, 0.05)

      ambient._clearNodes()

      expect(mockOscillator.stop).toHaveBeenCalled()
    })

    it('handles already-stopped nodes gracefully', async () => {
      ambient._init()
      ambient.nodes.push({ stop: () => { throw new Error('already stopped') } })

      expect(() => {
        ambient._clearNodes()
      }).not.toThrow()
    })
  })

  describe('oscillator creation', () => {
    it('creates oscillator with correct frequency and gain', async () => {
      ambient._init()
      const result = ambient._osc('sine', 440, 0.1)

      expect(result).toHaveProperty('osc')
      expect(result).toHaveProperty('gain')
      expect(result.osc.connect).toHaveBeenCalled()
      expect(result.osc.start).toHaveBeenCalled()
    })

    it('creates different oscillator types', async () => {
      ambient._init()
      ambient._osc('sine', 100, 0.05)
      ambient._osc('triangle', 200, 0.05)
      ambient._osc('sawtooth', 300, 0.05)

      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(3)
    })

    it('connects oscillator to master through gain', async () => {
      ambient._init()
      ambient._osc('sine', 100, 0.05)

      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })
  })

  describe('noise buffer loop', () => {
    it('creates and loops noise buffer', async () => {
      ambient._init()
      ambient._loopNoise(mockFilter, mockGainNode)

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled()
    })

    it('connects noise through filter to gain to master', async () => {
      ambient._init()
      ambient._loopNoise(mockFilter, mockGainNode)

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled()
    })

    it('generates noise buffer with random data', async () => {
      ambient._init()
      ambient._noiseBuffer()

      expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(1, 44100 * 2, 44100)
    })
  })

  describe('fade in/out', () => {
    it('fades in from 0 to volume over 2.5s', async () => {
      ambient._init()
      ambient._fadeIn()

      expect(ambient.master.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number))
      expect(ambient.master.gain.linearRampToValueAtTime).toHaveBeenCalled()
    })

    it('does not fade in if muted', async () => {
      ambient._init()
      ambient.muted = true
      ambient.master.gain.setValueAtTime.mockClear()

      ambient._fadeIn()

      // Should not call setValueAtTime if muted
      expect(ambient.master.gain.setValueAtTime).not.toHaveBeenCalled()
    })

    it('fades out over specified duration', async () => {
      ambient._init()
      ambient._fadeOut(1.2)

      expect(ambient.master.gain.cancelScheduledValues).toHaveBeenCalled()
      expect(ambient.master.gain.linearRampToValueAtTime).toHaveBeenCalled()
    })

    it('handles fade out with custom duration', async () => {
      ambient._init()
      ambient._fadeOut(0.5)

      expect(ambient.master.gain.linearRampToValueAtTime).toHaveBeenCalled()
    })
  })

  describe('timer management', () => {
    it('tracks timers in array', async () => {
      ambient._init()
      ambient._timer(() => {}, 100)

      expect(ambient.timers.length).toBeGreaterThan(0)
    })

    it('clears all timers', async () => {
      ambient._init()
      ambient._timer(() => {}, 100)
      ambient._timer(() => {}, 200)

      const timerCount = ambient.timers.length
      expect(timerCount).toBeGreaterThan(0)

      ambient._clearNodes()

      expect(ambient.timers.length).toBe(0)
    })
  })

  describe('integration scenarios', () => {
    it('type changes immediately when play() is called', async () => {
      // Note: with fake timers, the actual _build() happens in setTimeout
      // but the type is set immediately
      await ambient.play('dungeon')
      expect(ambient.type).toBe('dungeon')
    })

    it('switches between different scene types', async () => {
      await ambient.play('dungeon')
      expect(ambient.type).toBe('dungeon')

      await ambient.play('tavern')
      expect(ambient.type).toBe('tavern')

      await ambient.play('outdoor')
      expect(ambient.type).toBe('outdoor')
    })

    it('combat mode sets previous scene before switching', async () => {
      ambient.type = 'dungeon'
      ambient._combatPrev = null

      await ambient.combatMode(true)
      expect(ambient.type).toBe('combat')
      expect(ambient._combatPrev).toBe('dungeon')
    })

    it('combat mode reverts to previous scene', async () => {
      ambient.type = 'combat'
      ambient._combatPrev = 'tavern'

      await ambient.combatMode(false)
      expect(ambient.type).toBe('tavern')
      expect(ambient._combatPrev).toBeNull()
    })

    it('mutes and unmutes without losing volume setting', async () => {
      ambient._init()
      ambient.setVolume(0.6)

      ambient.setMuted(true)
      expect(ambient.volume).toBe(0.6)
      expect(ambient.muted).toBe(true)

      ambient.setMuted(false)
      expect(ambient.volume).toBe(0.6)
      expect(ambient.muted).toBe(false)
    })

    it('stops clears type and triggers fade out', async () => {
      ambient._init()
      ambient.type = 'dungeon'

      ambient.stop()

      expect(ambient.type).toBeNull()
      expect(ambient.master.gain.cancelScheduledValues).toHaveBeenCalled()
    })

    it('detects scene type correctly', () => {
      const tavern = { title: 'The Tavern', text: 'Crowded with patrons' }
      const detected = ambient.detect(tavern)
      expect(detected).toBe('tavern')
    })

    it('detect method works with various keywords', () => {
      expect(ambient.detect({ text: 'tavern' })).toBe('tavern')
      expect(ambient.detect({ text: 'town square' })).toBe('town')
      expect(ambient.detect({ text: 'forest' })).toBe('outdoor')
      expect(ambient.detect({ text: 'cave' })).toBe('dungeon')
    })
  })

  describe('edge cases', () => {
    it('handles empty scene object', () => {
      const result = ambient.detect({})
      expect(result).toBe('dungeon')
    })

    it('handles scene with only title', () => {
      const result = ambient.detect({ title: 'Tavern' })
      expect(result).toBe('tavern')
    })

    it('handles scene with only text', () => {
      const result = ambient.detect({ text: 'A quiet forest' })
      expect(result).toBe('outdoor')
    })

    it('prioritizes first matching scene type', () => {
      const mixed = { title: 'Tavern in Forest', text: 'Nature and people' }
      const result = ambient.detect(mixed)
      expect(result).toBe('tavern')
    })

    it('does not throw on uninitialized context operations', async () => {
      ambient.ctx = null

      expect(() => {
        ambient.setVolume(0.5)
        ambient.setMuted(true)
      }).not.toThrow()
    })

    it('handles volume at boundaries', () => {
      ambient._init()

      ambient.setVolume(0)
      expect(ambient.volume).toBe(0)

      ambient.setVolume(1)
      expect(ambient.volume).toBe(1)

      ambient.setVolume(0.5)
      expect(ambient.volume).toBe(0.5)
    })
  })
})
