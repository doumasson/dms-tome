import { useEffect } from 'react'
import { ambient } from '../lib/ambientAudio'

const THEME_TO_AUDIO = {
  village: 'outdoor', town: 'town', forest: 'outdoor',
  dungeon: 'dungeon', cave: 'dungeon', crypt: 'dungeon', sewer: 'dungeon',
}

export function useAmbientAudio({ theme, inCombat }) {
  useEffect(() => {
    const audioType = THEME_TO_AUDIO[theme] || 'outdoor'
    ambient?.play?.(audioType)
    return () => ambient?.play?.('silence')
  }, [theme])

  useEffect(() => {
    if (ambient?.combatMode) {
      ambient.combatMode(inCombat, THEME_TO_AUDIO[theme] || 'outdoor')
    }
  }, [inCombat, theme])
}
