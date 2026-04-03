// "Whispers in the Dark" — a self-contained 4-hour D&D 5e one-shot
// Designed for 3-5 players, levels 1-2. No prep required.

export const DEMO_CAMPAIGN = {
  title: 'Whispers in the Dark',
  description: 'A one-shot adventure for 3–5 players, levels 1–2. Strange disappearances plague the village of Ashwick. The trail leads into a cursed forest — and the old crypt beneath it.',
  scenes: [
    {
      title: 'Ashwick Village',
      text: 'The village of Ashwick sits beneath a grey autumn sky, its thatched roofs damp with morning dew. Farmers move through the market square with worried eyes — three villagers have vanished in as many nights, each leaving behind nothing but muddy footprints leading toward the Thornwood. The elder Mira Coldwell stands at the well, wringing her hands. She looks up as you approach. "Thank the gods. We sent word to the guild two days ago. Please — find our missing people before another night falls."',
      dmNotes: 'Intro scene. NPC Mira offers 50gp per person found alive. The missing: a farmer (Aldric), a young woman (Sera), and a child (Pip). Clues: claw marks on the eastern fence post, a torn strip of green cloth (Sera\'s), and a strange symbol carved into a tree trunk — a circle with an X, mark of the Hollow Cult. DC 12 History check reveals the Hollow Cult was a death cult that operated in the Thornwood decades ago. DC 10 Perception near the fence notices the muddy trail heads northeast.',
      fogOfWar: false,
      isEncounter: false,
      imageUrl: null,
    },
    {
      title: 'The Thornwood Trail',
      text: 'The Thornwood closes around you like a fist. Gnarled oaks blot out the sun; pale fungi glow faintly on the bark. The muddy trail is clear enough — until it splits at a mossy stone marker. A faint sobbing comes from the left fork. A snapping twig sounds from the right. The carved cult symbol appears again on the marker stone, this time with a crude arrow pointing right.',
      dmNotes: 'Skill challenge / exploration. Left fork leads to Sera, bound to a tree and terrified (she escaped a cultist who fled when she screamed). Right fork leads toward the crypt. Sera can describe her captor: robed, masked, carrying a lantern. DC 14 Survival to track. DC 12 Perception hears soft chanting ahead on the right fork. If players reunite Sera with the village before proceeding, give them a short rest.',
      fogOfWar: true,
      isEncounter: false,
      imageUrl: null, // sceneImage('dark fantasy thornwood forest gnarled trees fog glowing fungi'),
    },
    {
      title: 'Cultist Ambush',
      text: 'A clearing opens ahead. Three robed figures stand in a triangle, facing inward, chanting in low monotone. Between them, bound and unconscious, is the farmer Aldric. A pale lantern hangs from a branch, casting everything in sickly green light. One figure turns — its mask is a white skull. "Interlopers. The Warden will be pleased with more offerings."',
      dmNotes: 'Combat encounter. 3 Hollow Cultists (use Cult Fanatic stat block: HP 33, AC 13, +4 to hit, Inflict Wounds 3d10 necrotic 1/day, otherwise dagger +4 1d4+2). Tactics: one guards Aldric, two advance. They fight to the death — the Warden has promised them resurrection. After combat, Aldric regains consciousness and begs the party to find his son Pip, who the cultists dragged into the crypt beneath the hill. Loot: 3 cultist robes (uncommon disguise), 12gp, an iron key.',
      fogOfWar: true,
      isEncounter: true,
      enemies: [
        {
          name: 'Hollow Cultist',
          hp: 33, ac: 13, speed: 30, cr: '2',
          stats: { str: 10, dex: 14, con: 12, int: 10, wis: 12, cha: 14 },
          attacks: [
            { name: 'Dagger', bonus: '+4', damage: '1d4+2' },
            { name: 'Inflict Wounds', bonus: '+4', damage: '3d10 necrotic' },
          ],
          startPosition: { x: 4, y: 3 },
        },
        {
          name: 'Hollow Cultist',
          hp: 33, ac: 13, speed: 30, cr: '2',
          stats: { str: 10, dex: 14, con: 12, int: 10, wis: 12, cha: 14 },
          attacks: [
            { name: 'Dagger', bonus: '+4', damage: '1d4+2' },
            { name: 'Inflict Wounds', bonus: '+4', damage: '3d10 necrotic' },
          ],
          startPosition: { x: 6, y: 2 },
        },
        {
          name: 'Skull Masked Fanatic',
          hp: 40, ac: 14, speed: 30, cr: '2',
          stats: { str: 11, dex: 14, con: 12, int: 10, wis: 14, cha: 16 },
          attacks: [
            { name: 'Dagger', bonus: '+4', damage: '1d4+2' },
            { name: 'Inflict Wounds', bonus: '+5', damage: '3d10+2 necrotic' },
          ],
          startPosition: { x: 5, y: 5 },
        },
      ],
      imageUrl: null, // sceneImage('dark fantasy forest clearing cultists ritual lantern robed figures'),
    },
    {
      title: 'The Crypt Entrance',
      text: 'Set into a hillside, half-swallowed by roots: a stone door bearing the cult\'s circle-and-X. It hangs slightly ajar. Cold air breathes from within, carrying the smell of old stone and something sweet — rot, or incense, or both. Stone steps descend into darkness. Scratch marks on the doorframe, at child height, lead inside.',
      dmNotes: 'Transition / tension scene. No combat yet. Iron key from cultists fits the door lock (it\'s already open — someone is expecting them). DC 12 Perception: faint orange firelight below. DC 14 History: inscription above the door reads "Those who serve the Hollow pass freely; all others feed the dark." Party should feel the stakes — Pip is down there. Give them a moment to prepare: spells, torches, plans. If they don\'t have torches, a burned-down torch stub is just inside the door.',
      fogOfWar: true,
      isEncounter: false,
      imageUrl: null, // sceneImage('dark fantasy ancient stone crypt entrance hillside overgrown roots dungeon'),
    },
    {
      title: 'The Hollow Vault',
      text: 'The crypt opens into a vaulted chamber, its walls lined with niches — most empty, a few holding crumbling bones. At the far end, a raised stone dais holds a black iron brazier burning with green fire. Beside it, a tall figure in layered grey robes: the Warden. He holds Pip in an iron grip. The child is conscious, frightened, but unharmed. "You have killed my faithful," the Warden says, voice flat and cold. "A trade, then. Leave now and the boy walks free at dawn." His eyes never blink.',
      dmNotes: 'Boss encounter. The Warden is lying — he needs Pip alive for a ritual at midnight, after which Pip becomes the Hollow\'s new vessel. DC 15 Insight: the Warden\'s offer is false. DC 13 Persuasion buys 1 free round before initiative (he pauses to "consider"). The Warden is a Deathlock Mastermind (HP 110, AC 16, multiattack 2 daggers +6 2d4+3, Howl of the Hollow recharge 5-6: all creatures in 30ft DC 13 Wis save or Frightened until end of next turn, Misty Step bonus action). After falling below 50 HP: releases Pip and calls 2 Hollow Shades (Shadows, HP 16, AC 12, Strength Drain +4 1d6+2 necrotic, target loses 1d4 STR). When the Warden dies: the green fire extinguishes, the cult symbol crumbles from the walls, Pip runs to the party. Loot: 120gp in a leather pouch, a +1 dagger (Warden\'s), an obsidian amulet (focuses Inflict Wounds, attunes to a cleric/warlock).',
      fogOfWar: true,
      isEncounter: true,
      enemies: [
        {
          name: 'The Warden',
          hp: 110, ac: 16, speed: 30, cr: '8',
          stats: { str: 12, dex: 18, con: 14, int: 16, wis: 14, cha: 18 },
          attacks: [
            { name: 'Dagger of Shadow', bonus: '+6', damage: '2d4+3 piercing' },
            { name: 'Howl of the Hollow', bonus: '+6', damage: '3d8 necrotic (30ft, DC 13 Wis)' },
          ],
          startPosition: { x: 5, y: 1 },
        },
        {
          name: 'Hollow Shade',
          hp: 16, ac: 12, speed: 40, cr: '1/2',
          stats: { str: 6, dex: 14, con: 13, int: 6, wis: 10, cha: 8 },
          attacks: [
            { name: 'Strength Drain', bonus: '+4', damage: '1d6+2 necrotic' },
          ],
          startPosition: { x: 3, y: 2 },
        },
        {
          name: 'Hollow Shade',
          hp: 16, ac: 12, speed: 40, cr: '1/2',
          stats: { str: 6, dex: 14, con: 13, int: 6, wis: 10, cha: 8 },
          attacks: [
            { name: 'Strength Drain', bonus: '+4', damage: '1d6+2 necrotic' },
          ],
          startPosition: { x: 7, y: 2 },
        },
      ],
      imageUrl: null, // sceneImage('dark fantasy crypt vault underground boss chamber green fire brazier stone dais'),
    },
    {
      title: 'Return to Ashwick',
      text: 'Dawn breaks pale and clear as you emerge from the Thornwood, Pip clutching your cloak. Smoke curls from the village hearths. Mira Coldwell runs from the well the moment she sees the boy — her cry carries across the whole square. Within the hour the village is awake, bread and warm cider pressed into your hands. Aldric embraces his son so hard the boy laughs. Mira counts coin into your palm, her face older than last night but her eyes lighter. "The Hollow has held this valley in fear for thirty years," she says quietly. "You broke it in one night." She looks each of you in the eye. "If you ever need shelter or a friend in these parts — Ashwick remembers."',
      dmNotes: 'Epilogue. Award XP: 300 per cultist × 3 = 900, Skull Fanatic 450, The Warden 3800, Hollow Shades 100 × 2 = 200. Total: ~5350 XP split by party. Most level 1 parties will hit level 2. Mira pays the 50gp per rescued villager (Aldric, Sera, Pip = 150gp total). If the party returns the obsidian amulet to the village temple, they receive a *Bless* scroll as a bonus. Hook for future sessions: one cultist escaped — and he carries a copy of the Warden\'s ritual notes.',
      fogOfWar: false,
      isEncounter: false,
      imageUrl: null, // sceneImage('Ashwick medieval village dawn sunrise celebration returning heroes warm light'),
    },
  ],
};

export default DEMO_CAMPAIGN;
