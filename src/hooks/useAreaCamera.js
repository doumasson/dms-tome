import { useEffect, useRef } from 'react'
import Camera from '../engine/Camera'

/**
 * Manages the area camera — instantiation, keyboard controls (arrow keys),
 * and spacebar re-center on player.
 */
export function useAreaCamera({ zone, playerPosRef }) {
  const cameraRef = useRef(null)
  const useAreaCameraFlag = Boolean(zone?.palette) || zone?.useCamera || false

  // Instantiate camera when zone signals camera mode
  useEffect(() => {
    if (!useAreaCameraFlag) {
      cameraRef.current = null
      return
    }
    const w = window.innerWidth
    const h = window.innerHeight
    const cam = new Camera(w, h)
    const tileSize = zone?.tileSize || 200
    cam.setAreaBounds((zone?.width || 40) * tileSize, (zone?.height || 30) * tileSize)
    cam.centerOnImmediate(playerPosRef.current.x, playerPosRef.current.y, tileSize)
    cameraRef.current = cam
  }, [useAreaCameraFlag, zone?.width, zone?.height])

  // Camera keyboard controls — arrow keys pan, spacebar recenters on player
  useEffect(() => {
    if (!useAreaCameraFlag) return

    const keyMap = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    }

    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const cam = cameraRef.current
      if (!cam) return
      if (keyMap[e.key]) { cam.startPan(keyMap[e.key]); e.preventDefault() }
      if (e.key === ' ') {
        const myPos = playerPosRef.current
        if (myPos) cam.centerOn(myPos.x, myPos.y, zone?.tileSize || 200)
        e.preventDefault()
      }
    }
    const onKeyUp = (e) => {
      const cam = cameraRef.current
      if (!cam) return
      if (keyMap[e.key]) cam.stopPan(keyMap[e.key])
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [useAreaCameraFlag])

  return { cameraRef, useAreaCamera: useAreaCameraFlag }
}
