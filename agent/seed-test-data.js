#!/usr/bin/env node
/**
 * Seeds test data for the DungeonMind build agent.
 * - ONE campaign only (ever) — creates if missing
 * - Multiple characters (diverse classes for testing)
 * - Platform default API key in app_config
 * Idempotent — safe to run multiple times.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require(path.join(process.cwd(), 'node_modules', '@supabase', 'supabase-js', 'dist', 'index.cjs'));

// Load env files
const paEnvPath = path.join(require('os').homedir(), 'pa', '.env');
const envPath = path.join(process.cwd(), '.env');
for (const ep of [paEnvPath, envPath]) {
  if (fs.existsSync(ep)) {
    fs.readFileSync(ep, 'utf8').split('\n').forEach(line => {
      const [key, ...val] = line.split('=');
      if (key && val.length) process.env[key.trim()] = val.join('=').trim();
    });
  }
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// ─── CHARACTERS (diverse classes for testing) ─────────────────────────────────
const CHARACTERS = [
  {
    name: 'Kira Shadowblade', race: 'Human', class: 'Rogue', level: 3,
    background: 'Criminal',
    abilities: { str: 10, dex: 16, con: 14, int: 12, wis: 10, cha: 14 },
    maxHp: 24, currentHp: 24, ac: 14, speed: 30, proficiencyBonus: 2,
    skills: ['Stealth', 'Acrobatics', 'Deception', 'Sleight of Hand', 'Perception'],
    inventory: [
      { name: 'Shortsword', type: 'weapon', damage: '1d6+3', equipped: true },
      { name: 'Leather Armor', type: 'armor', ac: 11, equipped: true },
      { name: 'Healing Potion', type: 'consumable', effect: 'heal 2d4+2', quantity: 2 },
    ],
    equippedItems: { weapon: 'Shortsword', armor: 'Leather Armor' },
    gold: 50, hitDice: { die: 8, total: 3, remaining: 3 },
    spellSlots: {}, conditions: [], deathSaves: { successes: 0, failures: 0 }, xp: 900,
  },
  {
    name: 'Theron Brightshield', race: 'Human', class: 'Fighter', level: 3,
    background: 'Soldier',
    abilities: { str: 16, dex: 12, con: 16, int: 10, wis: 12, cha: 8 },
    maxHp: 31, currentHp: 31, ac: 18, speed: 30, proficiencyBonus: 2,
    skills: ['Athletics', 'Intimidation', 'Perception', 'Survival'],
    inventory: [
      { name: 'Longsword', type: 'weapon', damage: '1d8+3', equipped: true },
      { name: 'Chain Mail', type: 'armor', ac: 16, equipped: true },
      { name: 'Shield', type: 'armor', ac: 2, equipped: true },
      { name: 'Healing Potion', type: 'consumable', effect: 'heal 2d4+2', quantity: 1 },
    ],
    equippedItems: { weapon: 'Longsword', armor: 'Chain Mail', shield: 'Shield' },
    gold: 30, hitDice: { die: 10, total: 3, remaining: 3 },
    spellSlots: {}, conditions: [], deathSaves: { successes: 0, failures: 0 }, xp: 900,
  },
  {
    name: 'Elara Moonwhisper', race: 'Elf', class: 'Wizard', level: 3,
    background: 'Sage',
    abilities: { str: 8, dex: 14, con: 12, int: 17, wis: 13, cha: 10 },
    maxHp: 18, currentHp: 18, ac: 12, speed: 30, proficiencyBonus: 2,
    skills: ['Arcana', 'History', 'Investigation', 'Insight'],
    inventory: [
      { name: 'Quarterstaff', type: 'weapon', damage: '1d6', equipped: true },
      { name: 'Spellbook', type: 'tool', equipped: true },
      { name: 'Healing Potion', type: 'consumable', effect: 'heal 2d4+2', quantity: 1 },
    ],
    equippedItems: { weapon: 'Quarterstaff' },
    gold: 40, hitDice: { die: 6, total: 3, remaining: 3 },
    spellSlots: { 1: { total: 4, used: 0 }, 2: { total: 2, used: 0 } },
    conditions: [], deathSaves: { successes: 0, failures: 0 }, xp: 900,
    knownSpells: ['Fire Bolt', 'Mage Hand', 'Light', 'Magic Missile', 'Shield', 'Sleep', 'Burning Hands', 'Misty Step'],
    preparedSpells: ['Magic Missile', 'Shield', 'Sleep', 'Burning Hands', 'Misty Step'],
  },
  {
    name: 'Brother Aldric', race: 'Human', class: 'Cleric', level: 3,
    background: 'Acolyte',
    abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 16, cha: 12 },
    maxHp: 27, currentHp: 27, ac: 18, speed: 30, proficiencyBonus: 2,
    skills: ['Medicine', 'Religion', 'Insight', 'Persuasion'],
    inventory: [
      { name: 'Mace', type: 'weapon', damage: '1d6+2', equipped: true },
      { name: 'Chain Mail', type: 'armor', ac: 16, equipped: true },
      { name: 'Shield', type: 'armor', ac: 2, equipped: true },
      { name: 'Healing Potion', type: 'consumable', effect: 'heal 2d4+2', quantity: 2 },
    ],
    equippedItems: { weapon: 'Mace', armor: 'Chain Mail', shield: 'Shield' },
    gold: 35, hitDice: { die: 8, total: 3, remaining: 3 },
    spellSlots: { 1: { total: 4, used: 0 }, 2: { total: 2, used: 0 } },
    conditions: [], deathSaves: { successes: 0, failures: 0 }, xp: 900,
    knownSpells: ['Sacred Flame', 'Guidance', 'Spare the Dying', 'Healing Word', 'Bless', 'Shield of Faith', 'Spiritual Weapon', 'Aid'],
    preparedSpells: ['Healing Word', 'Bless', 'Shield of Faith', 'Spiritual Weapon', 'Aid'],
  },
];

const DEMO_CAMPAIGN_DATA = {
  title: 'Agent Test World',
  description: 'Procedural test world for the build agent',
  areaBriefs: [{
    id: 'village_start', theme: 'village', name: 'Millhaven Village',
    width: 40, height: 30,
    pois: [
      { type: 'building', name: 'Tavern', chunk: 'tavern_bar' },
      { type: 'building', name: 'Blacksmith', chunk: 'blacksmith' },
      { type: 'npc', name: 'Elder Theron', personality: 'wise old village elder' },
    ],
    exits: [{ direction: 'north', targetId: 'forest_path', label: 'Forest Path' }],
    enemies: [{ name: 'Goblin Scout', count: 2, cr: 0.25 }],
  }],
};

async function main() {
  // 1. Auth
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: process.env.VITE_TEST_USER_EMAIL,
    password: process.env.VITE_TEST_USER_PASSWORD,
  });
  if (authErr) {
    await supabase.auth.signUp({
      email: process.env.VITE_TEST_USER_EMAIL,
      password: process.env.VITE_TEST_USER_PASSWORD,
    });
    const { error: e2 } = await supabase.auth.signInWithPassword({
      email: process.env.VITE_TEST_USER_EMAIL,
      password: process.env.VITE_TEST_USER_PASSWORD,
    });
    if (e2) { console.log(JSON.stringify({ error: 'AUTH', detail: e2.message })); process.exit(1); }
  }

  const userId = (await supabase.auth.getUser()).data.user.id;
  console.error(`Auth: ${userId}`);

  // 2. Profile
  await supabase.from('profiles').upsert({ id: userId, email: process.env.VITE_TEST_USER_EMAIL, name: 'Agent Tester' }, { onConflict: 'id' });

  // 3. ONE campaign — find or create (NEVER create a second one)
  const { data: existingMembers } = await supabase
    .from('campaign_members').select('campaign_id, campaigns(*)').eq('user_id', userId).limit(1);

  let campaignId;
  if (existingMembers?.length > 0 && existingMembers[0].campaigns) {
    campaignId = existingMembers[0].campaign_id;
    console.error(`Campaign exists: ${campaignId}`);
  } else {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: c, error: ce } = await supabase.from('campaigns')
      .insert({ name: 'Agent Test World', host_user_id: userId, invite_code: code, campaign_data: DEMO_CAMPAIGN_DATA, settings: {} })
      .select().single();
    if (ce) { console.log(JSON.stringify({ error: 'CAMPAIGN', detail: ce.message })); process.exit(1); }
    campaignId = c.id;
    await supabase.from('campaign_members').upsert({ campaign_id: campaignId, user_id: userId, role: 'dm' }, { onConflict: 'campaign_id,user_id' });
    console.error(`Campaign created: ${campaignId}`);
  }

  // 4. Characters — create all that don't exist yet in the characters table
  const { data: existingChars } = await supabase.from('characters').select('name').eq('owner_user_id', userId);
  const existingNames = new Set((existingChars || []).map(c => c.name));

  let activeCharName = null;
  for (const char of CHARACTERS) {
    if (!existingNames.has(char.name)) {
      await supabase.from('characters').insert({
        owner_user_id: userId,
        name: char.name, class: char.class, race: char.race, level: char.level,
        character_data: char,
      });
      console.error(`Created character: ${char.name} (${char.race} ${char.class})`);
    }
    if (!activeCharName) activeCharName = char.name;
  }

  // 5. Ensure active character is set on campaign_members
  const { data: memberData } = await supabase.from('campaign_members')
    .select('character_data').eq('campaign_id', campaignId).eq('user_id', userId).single();

  if (!memberData?.character_data?.name) {
    await supabase.from('campaign_members')
      .update({ character_data: CHARACTERS[0] })
      .eq('campaign_id', campaignId).eq('user_id', userId);
    console.error(`Set active character: ${CHARACTERS[0].name}`);
  } else {
    activeCharName = memberData.character_data.name;
    console.error(`Active character: ${activeCharName}`);
  }

  console.log(JSON.stringify({
    status: 'ok', userId, campaignId,
    activeCharacter: activeCharName,
    totalCharacters: CHARACTERS.length,
    existingCharacters: existingNames.size,
  }));
}

main().catch(e => {
  console.log(JSON.stringify({ error: 'SEED', detail: e.message }));
  process.exit(1);
});
