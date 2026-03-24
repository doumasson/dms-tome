import { useEffect, useRef, useCallback } from 'react';
import useStore from '../../store/useStore';

/**
 * WeatherOverlay — Canvas-based particle system for rain, snow, and fog.
 * Renders on top of the game world, below UI. pointer-events: none.
 * Weather type is derived from zone/area metadata or can be set manually.
 */

const WEATHER_CONFIGS = {
  rain: {
    count: 200,
    color: 'rgba(150, 180, 220, 0.4)',
    speed: { min: 8, max: 14 },
    size: { w: 1.5, h: 12 },
    wind: 2,
    type: 'line',
  },
  heavy_rain: {
    count: 400,
    color: 'rgba(140, 170, 210, 0.5)',
    speed: { min: 12, max: 20 },
    size: { w: 2, h: 18 },
    wind: 4,
    type: 'line',
  },
  storm: {
    count: 500,
    color: 'rgba(130, 160, 200, 0.55)',
    speed: { min: 14, max: 24 },
    size: { w: 2.5, h: 22 },
    wind: 6,
    type: 'line',
  },
  snow: {
    count: 120,
    color: 'rgba(240, 245, 255, 0.7)',
    speed: { min: 0.5, max: 2 },
    size: { min: 2, max: 5 },
    wind: 0.3,
    type: 'circle',
    wobble: true,
  },
  fog: {
    count: 15,
    color: 'rgba(180, 190, 200, 0.08)',
    speed: { min: 0.2, max: 0.6 },
    size: { min: 100, max: 250 },
    wind: 0.5,
    type: 'blob',
  },
  ash: {
    count: 60,
    color: 'rgba(200, 120, 60, 0.5)',
    speed: { min: 0.8, max: 2.5 },
    size: { min: 2, max: 4 },
    wind: 1,
    type: 'circle',
    wobble: true,
  },
};

function createParticle(config, w, h) {
  return {
    x: Math.random() * w * 1.2 - w * 0.1,
    y: Math.random() * h * 1.2 - h * 0.1,
    speed: config.speed.min + Math.random() * (config.speed.max - config.speed.min),
    size: config.type === 'line'
      ? config.size
      : { r: (config.size.min || 2) + Math.random() * ((config.size.max || 5) - (config.size.min || 2)) },
    wobbleOffset: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.5 + Math.random() * 1.5,
    opacity: 0.3 + Math.random() * 0.7,
  };
}

function drawParticle(ctx, p, config, time) {
  ctx.globalAlpha = p.opacity;

  if (config.type === 'line') {
    ctx.strokeStyle = config.color;
    ctx.lineWidth = p.size.w;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + config.wind * 2, p.y + p.size.h);
    ctx.stroke();
  } else if (config.type === 'circle') {
    const wobbleX = config.wobble ? Math.sin(time * p.wobbleSpeed + p.wobbleOffset) * 1.5 : 0;
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(p.x + wobbleX, p.y, p.size.r, 0, Math.PI * 2);
    ctx.fill();
  } else if (config.type === 'blob') {
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size.r);
    gradient.addColorStop(0, config.color);
    gradient.addColorStop(1, 'rgba(180, 190, 200, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function updateParticle(p, config, w, h, dt) {
  p.y += p.speed * dt;
  p.x += config.wind * dt;

  // Reset when off screen
  if (p.y > h + 20) {
    p.y = -20;
    p.x = Math.random() * w * 1.2 - w * 0.1;
  }
  if (p.x > w + 50) {
    p.x = -50;
  }
}

export default function WeatherOverlay() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);
  const configRef = useRef(null);

  // Get weather from store (set by game time system)
  const weatherState = useStore(s => s.weather);
  const weather = weatherState?.current || null;

  const initParticles = useCallback((config, w, h) => {
    particlesRef.current = Array.from({ length: config.count }, () =>
      createParticle(config, w, h)
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const config = WEATHER_CONFIGS[weather];
    if (!config) {
      // No weather — clear and stop
      configRef.current = null;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    configRef.current = config;
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      initParticles(config, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');
    let lastTime = performance.now();

    const animate = (now) => {
      const dt = Math.min((now - lastTime) / 16.67, 3); // normalize to ~60fps
      lastTime = now;
      const time = now / 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        updateParticle(p, config, canvas.width, canvas.height, dt);
        drawParticle(ctx, p, config, time);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [weather, initParticles]);

  // Don't render canvas at all if no weather
  if (!weather || !WEATHER_CONFIGS[weather]) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 45, // below day/night (50) and HUD (100)
      }}
    />
  );
}

/** Available weather types for zone/area metadata */
export const WEATHER_TYPES = Object.keys(WEATHER_CONFIGS);
