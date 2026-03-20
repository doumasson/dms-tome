import { describe, it, expect } from 'vitest'
import { advanceTime, getTimeOfDay, formatTime } from './gameTime.js'

describe('advanceTime', () => {
  it('advances hours within same day', () => {
    expect(advanceTime({ hour: 10, day: 1 }, 3)).toEqual({ hour: 13, day: 1 })
  })
  it('wraps to next day', () => {
    expect(advanceTime({ hour: 22, day: 1 }, 5)).toEqual({ hour: 3, day: 2 })
  })
  it('handles multi-day advance', () => {
    expect(advanceTime({ hour: 10, day: 1 }, 50)).toEqual({ hour: 12, day: 3 })
  })
})

describe('getTimeOfDay', () => {
  it('returns dawn for 5-7', () => { expect(getTimeOfDay(6)).toBe('dawn') })
  it('returns day for 8-17', () => { expect(getTimeOfDay(12)).toBe('day') })
  it('returns dusk for 18-19', () => { expect(getTimeOfDay(18)).toBe('dusk') })
  it('returns night for 20-4', () => {
    expect(getTimeOfDay(22)).toBe('night')
    expect(getTimeOfDay(2)).toBe('night')
  })
})

describe('formatTime', () => {
  it('formats morning', () => { expect(formatTime({ hour: 9, day: 1 })).toBe('9:00 AM, Day 1') })
  it('formats afternoon', () => { expect(formatTime({ hour: 14, day: 3 })).toBe('2:00 PM, Day 3') })
})
