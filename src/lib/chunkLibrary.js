/**
 * ChunkLibrary — manages reusable map pieces (chunks) for procedural generation.
 *
 * Chunks are categorized by type (building, room, encounter, terrain, landmark)
 * and matched by tag overlap for best-fit selection during map assembly.
 */

export class ChunkLibrary {
  constructor() {
    this.chunks = new Map()   // id → chunk
    this.byType = new Map()   // type → [chunk]
  }

  clear() {
    this.chunks.clear()
    this.byType.clear()
  }

  register(chunk) {
    this.chunks.set(chunk.id, chunk)
    if (!this.byType.has(chunk.type)) this.byType.set(chunk.type, [])
    this.byType.get(chunk.type).push(chunk)
  }

  get(id) {
    return this.chunks.get(id) || null
  }

  listByType(type) {
    return this.byType.get(type) || []
  }

  /**
   * Find best matching chunk by type and tag overlap.
   * Picks randomly from top-tier candidates for variety.
   * @param {string} type - chunk type
   * @param {string[]} tags - desired tags
   * @param {Function} [rand] - seeded RNG (0-1), defaults to Math.random
   * @param {Set} [avoid] - chunk IDs to penalize (prevents duplicate buildings on same map)
   */
  findBest(type, tags = [], rand = Math.random, avoid = new Set()) {
    const candidates = this.listByType(type)
    if (!candidates.length) return null

    const scored = candidates.map(chunk => {
      let score = 0
      for (const tag of tags) {
        if (chunk.tags.includes(tag)) score += 1
      }
      if (chunk.source !== 'generated') score += 0.5
      if (avoid.has(chunk.id)) score -= 1
      return { chunk, score }
    })

    scored.sort((a, b) => b.score - a.score)
    const threshold = scored[0].score - 0.5
    const topTier = scored.filter(s => s.score >= threshold)
    return topTier[Math.floor(rand() * topTier.length)].chunk
  }

  /** Load all chunks from an array (e.g., from bundled JSON or Supabase) */
  loadAll(chunkArray) {
    for (const chunk of chunkArray) {
      this.register(chunk)
    }
  }
}
