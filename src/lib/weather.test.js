import { describe, it, expect } from 'vitest'
import { getVisionPenalty, rollWeatherChange } from './weather.js'

describe('getVisionPenalty', () => {
  it('returns 0 for clear', () => { expect(getVisionPenalty('clear')).toBe(0) })
  it('returns 2 for rain', () => { expect(getVisionPenalty('rain')).toBe(2) })
  it('returns 4 for heavy_rain', () => { expect(getVisionPenalty('heavy_rain')).toBe(4) })
  it('returns 2 for snow', () => { expect(getVisionPenalty('snow')).toBe(2) })
  it('returns 6 for fog', () => { expect(getVisionPenalty('fog')).toBe(6) })
  it('returns 4 for storm', () => { expect(getVisionPenalty('storm')).toBe(4) })
})

describe('rollWeatherChange', () => {
  it('returns a valid weather type', () => {
    const valid = ['clear','rain','heavy_rain','snow','fog','storm']
    for (let i = 0; i < 20; i++) {
      expect(valid).toContain(rollWeatherChange('clear'))
    }
  })
})
