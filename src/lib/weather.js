const VISION_PENALTIES = { clear: 0, rain: 2, heavy_rain: 4, snow: 2, fog: 6, storm: 4 }
const TRANSITIONS = {
  clear: ['clear','clear','clear','rain','fog'],
  rain: ['rain','rain','clear','heavy_rain','storm'],
  heavy_rain: ['heavy_rain','rain','storm'],
  snow: ['snow','snow','clear'],
  fog: ['fog','clear','rain'],
  storm: ['storm','heavy_rain','rain','clear'],
}

export function getVisionPenalty(weather) { return VISION_PENALTIES[weather] || 0 }
export function rollWeatherChange(current) {
  const options = TRANSITIONS[current] || TRANSITIONS.clear
  return options[Math.floor(Math.random() * options.length)]
}
