/**
 * Lightweight tweening engine for token animations.
 * Handles smooth movement and position interpolation using requestAnimationFrame.
 */

class Tween {
  constructor(target, from, to, duration, easing = 'linear', onUpdate, onComplete) {
    this.target = target;
    this.from = from;
    this.to = to;
    this.duration = duration;
    this.easing = easing;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.elapsed = 0;
    this.isActive = true;
  }

  update(deltaTime) {
    if (!this.isActive) return false;

    this.elapsed += deltaTime;
    const progress = Math.min(this.elapsed / this.duration, 1);
    const eased = this.applyEasing(progress);

    // Interpolate position
    const current = {
      x: this.from.x + (this.to.x - this.from.x) * eased,
      y: this.from.y + (this.to.y - this.from.y) * eased,
    };

    this.onUpdate?.(current);

    if (progress >= 1) {
      // Ensure final position is exact
      this.onUpdate?.({ x: this.to.x, y: this.to.y });
      this.onComplete?.();
      this.isActive = false;
      return false;
    }

    return true;
  }

  applyEasing(progress) {
    switch (this.easing) {
      case 'easeInOutQuad':
        return progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;
      case 'easeOutQuad':
        return 1 - (1 - progress) * (1 - progress);
      case 'easeInQuad':
        return progress * progress;
      case 'easeInOutCubic':
        return progress < 0.5
          ? 4 * progress * progress * progress
          : (progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1;
      case 'linear':
      default:
        return progress;
    }
  }

  cancel() {
    this.isActive = false;
  }
}

export class TweenEngine {
  constructor(ticker) {
    this.ticker = ticker;
    this.tweens = new Map(); // Map<id, Tween[]>
    this.lastTime = performance.now();

    // Bind update to ticker
    if (ticker) {
      this.ticker.add(() => this.update());
    }
  }

  /**
   * Create a tween animation
   * @param {string} id - Unique identifier for this animation
   * @param {object} from - {x, y} start position
   * @param {object} to - {x, y} end position
   * @param {number} duration - Duration in milliseconds
   * @param {string} easing - Easing function name
   * @param {function} onUpdate - Called with {x, y} each frame
   * @param {function} onComplete - Called when animation finishes
   */
  to(id, from, to, duration, easing = 'linear', onUpdate, onComplete) {
    // Cancel existing tweens on this id
    this.cancel(id);

    const tween = new Tween(id, from, to, duration, easing, onUpdate, onComplete);

    if (!this.tweens.has(id)) {
      this.tweens.set(id, []);
    }
    this.tweens.get(id).push(tween);

    return tween;
  }

  /**
   * Cancel all tweens with given id
   */
  cancel(id) {
    if (this.tweens.has(id)) {
      this.tweens.get(id).forEach(tween => tween.cancel());
      this.tweens.delete(id);
    }
  }

  /**
   * Update all active tweens (called each frame via ticker)
   */
  update() {
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    const toDelete = [];

    for (const [id, tweenList] of this.tweens.entries()) {
      const active = tweenList.filter(tween => tween.update(deltaTime));

      if (active.length === 0) {
        toDelete.push(id);
      } else {
        this.tweens.set(id, active);
      }
    }

    toDelete.forEach(id => this.tweens.delete(id));
  }

  /**
   * Check if animation is active
   */
  isAnimating(id) {
    return this.tweens.has(id) && this.tweens.get(id).length > 0;
  }

  /**
   * Get count of active animations
   */
  getActiveCount() {
    let count = 0;
    for (const tweenList of this.tweens.values()) {
      count += tweenList.length;
    }
    return count;
  }
}

// Export singleton instance (will be initialized with ticker in PixiApp)
export const tweenEngine = new TweenEngine(null);
