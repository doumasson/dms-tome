-- ============================================================
-- Migration 001: Character Portability
-- Run in Supabase SQL Editor (project dashboard → SQL Editor)
-- ============================================================
-- Creates player-owned character tables separate from campaigns.
-- Characters are portable: identity transfers between campaigns,
-- progression resets per campaign rules.
-- ============================================================

-- 1. Create the permanent characters table (player-owned)
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identity (transfers between campaigns)
  name TEXT NOT NULL,
  class TEXT NOT NULL DEFAULT '',
  race TEXT NOT NULL DEFAULT '',
  background TEXT NOT NULL DEFAULT '',
  appearance TEXT,
  personality TEXT,
  backstory TEXT,
  portrait_url TEXT,

  -- Full character data blob (class features, proficiencies, etc.)
  character_data JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create per-campaign character state (resets on transfer)
CREATE TABLE IF NOT EXISTS campaign_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Progression (resets when character transfers to new campaign)
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,

  -- Resources (persist between sessions, reset on rest only)
  current_hp INTEGER,
  spell_slots_used JSONB NOT NULL DEFAULT '{}',
  resources_used JSONB NOT NULL DEFAULT '{}',
  gold INTEGER NOT NULL DEFAULT 0,

  -- Equipment (resets on transfer — starts with level-appropriate gear)
  equipment JSONB NOT NULL DEFAULT '[]',

  -- Conditions + position (session state)
  conditions TEXT[] NOT NULL DEFAULT '{}',
  position_x INTEGER,
  position_y INTEGER,

  -- Role in this campaign
  role TEXT NOT NULL DEFAULT 'player',

  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(campaign_id, character_id)
);

-- 3. Indexes for common lookups
CREATE INDEX IF NOT EXISTS characters_owner_idx ON characters(owner_user_id);
CREATE INDEX IF NOT EXISTS campaign_characters_campaign_idx ON campaign_characters(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_characters_user_idx ON campaign_characters(user_id);
CREATE INDEX IF NOT EXISTS campaign_characters_char_idx ON campaign_characters(character_id);

-- 4. Row Level Security
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_characters ENABLE ROW LEVEL SECURITY;

-- Characters: owner can do everything; campaign members can read
CREATE POLICY "characters_owner_all" ON characters
  FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY "characters_campaign_members_read" ON characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_characters cc
      JOIN campaign_members cm ON cm.campaign_id = cc.campaign_id
      WHERE cc.character_id = characters.id
        AND cm.user_id = auth.uid()
    )
  );

-- Campaign characters: owner + DM can do everything; other members can read
CREATE POLICY "campaign_characters_owner_all" ON campaign_characters
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "campaign_characters_dm_all" ON campaign_characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_id AND c.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "campaign_characters_members_read" ON campaign_characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaign_characters.campaign_id
        AND cm.user_id = auth.uid()
    )
  );

-- 5. Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER campaign_characters_updated_at
  BEFORE UPDATE ON campaign_characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. Migrate existing data from campaign_members.character_data
-- This copies existing characters into the new tables.
-- Only run ONCE after creating the tables above.
-- ============================================================
INSERT INTO characters (id, owner_user_id, name, class, race, background, character_data, created_at, updated_at)
SELECT
  gen_random_uuid(),
  cm.user_id,
  COALESCE(cm.character_data->>'name', 'Unknown'),
  COALESCE(cm.character_data->>'class', ''),
  COALESCE(cm.character_data->>'race', ''),
  COALESCE(cm.character_data->>'background', ''),
  cm.character_data,
  cm.joined_at,
  cm.joined_at
FROM campaign_members cm
WHERE cm.character_data IS NOT NULL
  AND cm.character_data->>'name' IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- DONE. Verify with:
--   SELECT COUNT(*) FROM characters;
--   SELECT COUNT(*) FROM campaign_characters;
-- ============================================================
