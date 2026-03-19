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
   * Prefers curated over generated. Higher tag overlap = better match.
   */
  findBest(type, tags = []) {
    const candidates = this.listByType(type)
    if (!candidates.length) return null

    let best = null
    let bestScore = -1

    for (const chunk of candidates) {
      let score = 0
      for (const tag of tags) {
        if (chunk.tags.includes(tag)) score += 1
      }
      // Prefer curated chunks
      if (chunk.source !== 'generated') score += 0.5

      if (score > bestScore) {
        bestScore = score
        best = chunk
      }
    }

    return best
  }

  /** Load all chunks from an array (e.g., from bundled JSON or Supabase) */
  loadAll(chunkArray) {
    for (const chunk of chunkArray) {
      this.register(chunk)
    }
  }
}
