#!/usr/bin/env node
/**
 * Seeds test data for the DungeonMind build agent.
 * Creates a campaign and character for the test user if they don't exist.
 * Run once at agent start — idempotent (safe to run multiple times).
 *
 * Requires: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
 *           VITE_TEST_USER_EMAIL, VITE_TEST_USER_PASSWORD in .env
 */
const fs = require('fs');
const path = require('path');
// Load supabase from the project's node_modules (script runs from repo root)
const { createClient } = require(path.join(process.cwd(), 'node_modules', '@supabase', 'supabase-js', 'dist', 'index.cjs'));

// Load .env from the project root (cwd) AND PA .env for the API key
const envPath = path.join(process.cwd(), '.env');
const paEnvPath = path.join(require('os').homedir(), 'pa', '.env');
// Load both env files — PA env has the API key, project env has Supabase
for (const ep of [paEnvPath, envPath]) {
  if (fs.existsSync(ep)) {
    fs.readFileSync(ep, 'utf8').split('\n').forEach(line => {
      const [key, ...val] = line.split('=');
      if (key && val.length) process.env[key.trim()] = val.join('=').trim();
    });
  }
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const DEMO_CAMPAIGN_DATA = {
  title: 'Agent Test World',
  description: 'Procedural test world for the build agent',
  areaBriefs: [
    {
      id: 'village_start',
      theme: 'village',
      name: 'Millhaven Village',
      width: 40, height: 30,
      pois: [
        { type: 'building', name: 'Tavern', chunk: 'tavern_bar' },
        { type: 'building', name: 'Blacksmith', chunk: 'blacksmith' },
        { type: 'npc', name: 'Elder Theron', personality: 'wise old village elder' },
      ],
      exits: [
        { direction: 'north', targetId: 'forest_path', label: 'Forest Path' }
      ],
      enemies: [
        { name: 'Goblin Scout', count: 2, cr: 0.25 }
      ]
    }
  ]
};

const TEST_CHARACTER = {
  name: 'Kira Shadowblade',
  race: 'Human',
  class: 'Rogue',
  level: 3,
  background: 'Criminal',
  abilities: { str: 10, dex: 16, con: 14, int: 12, wis: 10, cha: 14 },
  maxHp: 24, currentHp: 24,
  ac: 14,
  speed: 30,
  proficiencyBonus: 2,
  skills: ['Stealth', 'Acrobatics', 'Deception', 'Sleight of Hand', 'Perception', 'Thieves Tools'],
  inventory: [
    { name: 'Shortsword', type: 'weapon', damage: '1d6+3', equipped: true },
    { name: 'Leather Armor', type: 'armor', ac: 11, equipped: true },
    { name: 'Healing Potion', type: 'consumable', effect: 'heal 2d4+2', quantity: 2 },
    { name: 'Thieves Tools', type: 'tool', equipped: true },
  ],
  equippedItems: { weapon: 'Shortsword', armor: 'Leather Armor' },
  gold: 50,
  hitDice: { die: 8, total: 3, remaining: 3 },
  spellSlots: {},
  conditions: [],
  deathSaves: { successes: 0, failures: 0 },
  xp: 900,
};

async function main() {
  // 1. Sign in as test user
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: process.env.VITE_TEST_USER_EMAIL,
    password: process.env.VITE_TEST_USER_PASSWORD,
  });
  if (authErr) {
    // Try creating the user first
    const { data: signup, error: signupErr } = await supabase.auth.signUp({
      email: process.env.VITE_TEST_USER_EMAIL,
      password: process.env.VITE_TEST_USER_PASSWORD,
    });
    if (signupErr) {
      console.log(JSON.stringify({ error: 'AUTH_FAILED', detail: authErr.message }));
      process.exit(1);
    }
    // Sign in again after signup
    const { data: auth2, error: authErr2 } = await supabase.auth.signInWithPassword({
      email: process.env.VITE_TEST_USER_EMAIL,
      password: process.env.VITE_TEST_USER_PASSWORD,
    });
    if (authErr2) {
      console.log(JSON.stringify({ error: 'AUTH_FAILED_AFTER_SIGNUP', detail: authErr2.message }));
      process.exit(1);
    }
  }

  const userId = (await supabase.auth.getUser()).data.user.id;
  console.error(`Authenticated as ${userId}`);

  // 1b. Ensure platform default API key exists in app_config
  // This is the owner's key — all players use it by default (no ApiKeyGate)
  const platformKey = process.env.PA_CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '';
  if (platformKey) {
    const { error: configErr } = await supabase
      .from('app_config')
      .upsert({ key: 'default_claude_api_key', value: platformKey }, { onConflict: 'key' });
    if (configErr) {
      // Table might not exist — try creating it
      console.error(`app_config upsert note: ${configErr.message} (may need table creation)`);
    } else {
      console.error('Platform default API key set in app_config');
    }
  }

  // 2. Ensure profile exists
  await supabase.from('profiles').upsert({
    id: userId,
    email: process.env.VITE_TEST_USER_EMAIL,
    name: 'Agent Tester',
  }, { onConflict: 'id' });

  // 3. Check for existing campaign
  const { data: existingMembers } = await supabase
    .from('campaign_members')
    .select('campaign_id, campaigns(*)')
    .eq('user_id', userId)
    .limit(1);

  let campaignId;
  if (existingMembers && existingMembers.length > 0 && existingMembers[0].campaigns) {
    campaignId = existingMembers[0].campaign_id;
    console.error(`Found existing campaign: ${campaignId}`);
  } else {
    // Create campaign
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .insert({
        name: 'Agent Test World',
        host_user_id: userId,
        invite_code: inviteCode,
        campaign_data: DEMO_CAMPAIGN_DATA,
        settings: {},
      })
      .select()
      .single();

    if (campErr) {
      console.log(JSON.stringify({ error: 'CAMPAIGN_CREATE_FAILED', detail: campErr.message }));
      process.exit(1);
    }
    campaignId = campaign.id;
    console.error(`Created campaign: ${campaignId}`);

    // Add user as host member
    await supabase.from('campaign_members').upsert({
      campaign_id: campaignId,
      user_id: userId,
      role: 'dm',
    }, { onConflict: 'campaign_id,user_id' });
  }

  // 4. Check for existing character in this campaign
  const { data: memberData } = await supabase
    .from('campaign_members')
    .select('character_data')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .single();

  if (memberData?.character_data?.name) {
    console.error(`Found existing character: ${memberData.character_data.name}`);
  } else {
    // Save character to campaign_members
    await supabase
      .from('campaign_members')
      .update({ character_data: TEST_CHARACTER })
      .eq('campaign_id', campaignId)
      .eq('user_id', userId);

    // Also save to characters table for portability
    const { data: existing } = await supabase
      .from('characters')
      .select('id')
      .eq('owner_user_id', userId)
      .eq('name', TEST_CHARACTER.name)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from('characters').insert({
        owner_user_id: userId,
        name: TEST_CHARACTER.name,
        class: TEST_CHARACTER.class,
        race: TEST_CHARACTER.race,
        level: TEST_CHARACTER.level,
        character_data: TEST_CHARACTER,
      });
    }
    console.error(`Created character: ${TEST_CHARACTER.name}`);
  }

  console.log(JSON.stringify({
    status: 'ok',
    userId,
    campaignId,
    character: memberData?.character_data?.name || TEST_CHARACTER.name,
  }));
}

main().catch(e => {
  console.log(JSON.stringify({ error: 'SEED_FAILED', detail: e.message }));
  process.exit(1);
});
