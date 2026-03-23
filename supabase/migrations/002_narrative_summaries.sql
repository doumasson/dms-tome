-- ============================================================
-- Migration 002: Narrative Summaries
-- Run in Supabase SQL Editor (project dashboard → SQL Editor)
-- ============================================================
-- Stores AI-generated summaries of campaign narratives for context
-- and session persistence.
-- ============================================================

-- 1. Create narrative_summaries table
CREATE TABLE IF NOT EXISTS narrative_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Summary of the narrative so far (for context to the Narrator AI)
  summary TEXT NOT NULL,

  -- Session/encounter the summary covers
  session_number INTEGER,
  encounter_index INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for common lookups
CREATE INDEX IF NOT EXISTS narrative_summaries_campaign_idx ON narrative_summaries(campaign_id);
CREATE INDEX IF NOT EXISTS narrative_summaries_session_idx ON narrative_summaries(campaign_id, session_number);

-- 3. Row Level Security
ALTER TABLE narrative_summaries ENABLE ROW LEVEL SECURITY;

-- Narrative summaries: DM and campaign members can read
-- DM can insert/update/delete
CREATE POLICY "narrative_summaries_members_read" ON narrative_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = narrative_summaries.campaign_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "narrative_summaries_dm_all" ON narrative_summaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_id AND c.dm_user_id = auth.uid()
    )
  );

-- 4. Auto-update updated_at timestamp
CREATE TRIGGER narrative_summaries_updated_at
  BEFORE UPDATE ON narrative_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DONE. Verify with:
--   SELECT COUNT(*) FROM narrative_summaries;
-- ============================================================
