// D&D 5e SRD Standard Actions and Bonus Actions
// Used by the ActionPanel for all classes during combat

export const STANDARD_ACTIONS = [
  {
    name: "Attack",
    type: "action",
    description: "Make one melee or ranged weapon attack. Some features (Extra Attack) allow multiple attacks.",
    requiresTarget: true,
    effect: "weapon_attack"
  },
  {
    name: "Cast a Spell",
    type: "action",
    description: "Cast a spell with a casting time of 1 action. Some spells can be cast as a bonus action.",
    requiresTarget: false,
    effect: "spellcasting"
  },
  {
    name: "Dash",
    type: "action",
    description: "Gain extra movement equal to your speed for this turn (effectively doubling your speed this turn).",
    requiresTarget: false,
    effect: "double_movement"
  },
  {
    name: "Disengage",
    type: "action",
    description: "Your movement doesn't provoke opportunity attacks for the rest of the turn.",
    requiresTarget: false,
    effect: "no_opportunity_attacks"
  },
  {
    name: "Dodge",
    type: "action",
    description: "Until the start of your next turn, any attack roll made against you has disadvantage if you can see the attacker, and you make DEX saving throws with advantage.",
    requiresTarget: false,
    effect: "dodging_until_next_turn"
  },
  {
    name: "Help",
    type: "action",
    description: "Give an ally advantage on their next ability check or attack roll against a creature within 5 feet of you before the start of your next turn.",
    requiresTarget: true,
    effect: "grant_advantage"
  },
  {
    name: "Hide",
    type: "action",
    description: "Make a Dexterity (Stealth) check in an attempt to hide. You must be heavily obscured or behind full cover.",
    requiresTarget: false,
    effect: "stealth_check"
  },
  {
    name: "Ready",
    type: "action",
    description: "Prepare to do something in response to a trigger. Specify a perceivable trigger and a response action or movement. If the trigger occurs before your next turn, you can use your reaction.",
    requiresTarget: false,
    effect: "ready_action"
  },
  {
    name: "Search",
    type: "action",
    description: "Devote your attention to finding something. Make a Wisdom (Perception) check or an Intelligence (Investigation) check as the DM decides.",
    requiresTarget: false,
    effect: "search_check"
  },
  {
    name: "Use an Object",
    type: "action",
    description: "When an object requires your action for its use, or when you want to interact with a second object in a turn (you can interact with one object for free per turn).",
    requiresTarget: false,
    effect: "use_object"
  },
  {
    name: "Grapple",
    type: "action",
    description: "Make an Athletics check contested by the target's Athletics or Acrobatics check. On a success, the target is Grappled (speed 0). The target must be within reach and no more than one size larger than you.",
    requiresTarget: true,
    effect: "grapple_check"
  },
  {
    name: "Shove",
    type: "action",
    description: "Make an Athletics check contested by the target's Athletics or Acrobatics. On success, shove the target 5 feet away or knock it prone. Target must be within 5 feet and no more than one size larger than you.",
    requiresTarget: true,
    effect: "shove_check"
  },
  {
    name: "Improvise",
    type: "action",
    description: "Do something not covered by any other action. Describe the action and the DM will adjudicate.",
    requiresTarget: false,
    effect: "improvised_action"
  }
];

export const STANDARD_BONUS_ACTIONS = [
  {
    name: "Off-Hand Attack",
    type: "bonus_action",
    description: "When you take the Attack action with a light melee weapon, you can use your bonus action to attack with a different light melee weapon in the other hand. You don't add your ability modifier to the damage unless it's negative.",
    requiresTarget: true,
    requirement: "two_weapon_fighting",
    effect: "offhand_attack"
  },
  {
    name: "Cast Bonus Action Spell",
    type: "bonus_action",
    description: "Cast a spell with a casting time of 1 bonus action. Note: if you cast a bonus action spell and another spell on the same turn, the other spell must be a cantrip.",
    requiresTarget: false,
    effect: "spellcasting_bonus"
  },
  {
    name: "Interact with Object",
    type: "bonus_action",
    description: "Some items or class features allow interaction as a bonus action (e.g., potion drinking can be done with a bonus action for Rogues via Fast Hands).",
    requiresTarget: false,
    effect: "object_interaction"
  }
];

export const STANDARD_REACTIONS = [
  {
    name: "Opportunity Attack",
    type: "reaction",
    description: "When a hostile creature that you can see moves out of your reach, you can use your reaction to make one melee attack against that creature.",
    requiresTarget: true,
    trigger: "enemy_leaves_reach",
    effect: "melee_attack"
  },
  {
    name: "Ready Action Trigger",
    type: "reaction",
    description: "When the trigger you specified for your Ready action occurs, you may use your reaction to carry out the readied action.",
    requiresTarget: false,
    trigger: "ready_trigger",
    effect: "readied_action"
  },
  {
    name: "Shield (Spell)",
    type: "reaction",
    description: "Requires Shield spell. When you are hit by an attack or targeted by magic missile, gain +5 AC until start of your next turn and take no damage from magic missile.",
    requiresTarget: false,
    trigger: "hit_by_attack",
    effect: "shield_spell",
    requirement: "shield_spell_prepared"
  }
];

// Free actions / Interactions (one per turn, usually free)
export const FREE_INTERACTIONS = [
  {
    name: "Draw or Sheathe Weapon",
    description: "Draw or put away one weapon as part of your movement or action. You can interact with a second weapon only if you use the Use an Object action."
  },
  {
    name: "Open or Close Door",
    description: "Open or close a door as part of your movement."
  },
  {
    name: "Pick Up Item",
    description: "Pick up a dropped weapon or other object from the ground."
  },
  {
    name: "Hand Off Item",
    description: "Hand an item to another creature within reach."
  },
  {
    name: "Drop Item",
    description: "Drop a held item onto the ground in your space or an adjacent space."
  }
];

// Lookup map for quick access
export const ACTION_LOOKUP = Object.fromEntries(
  [...STANDARD_ACTIONS, ...STANDARD_BONUS_ACTIONS, ...STANDARD_REACTIONS]
    .map(a => [a.name, a])
);
