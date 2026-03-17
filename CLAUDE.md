# DM's Tome

## What Is This
A multiplayer D&D 5e campaign management app. Users sign in with Google, create or join campaigns, and play together. DMs generate campaigns using AI prompts, then import the JSON to run sessions.

## Tech Stack
- React + Vite
- Zustand (state management)
- Supabase (auth + database)
- Vercel (hosting)

## Database Tables (in Supabase)
- profiles (id, email, name, avatar_url, created_at)
- campaigns (id, name, dm_user_id, invite_code, campaign_data, settings, created_at, updated_at)
- campaign_members (id, campaign_id, user_id, role [dm/player], character_data, joined_at)

## User Flows

### DM Flow:
1. Sign in with Google
2. Click "Create New Campaign"
3. Step 1: Campaign name and basic settings
4. Step 2: Tone, themes, length
5. Step 3: Character info
6. Step 4: Generate prompt (copy to AI)
7. Step 5: Upload JSON file or paste JSON
8. Enter campaign as DM
9. Share invite code with players

### Player Flow:
1. Get invite code from DM
2. Sign in with Google
3. Enter invite code
4. Create/upload character
5. Join campaign

## Campaign JSON Import
- Primary: Upload .json file
- Secondary: Paste JSON text
- Must clean AI output:
  - Replace \[ with [
  - Replace \] with ]
  - Remove markdown code blocks
  - Trim whitespace

## Features Built
- Google sign-in
- Campaign select screen
- Campaign creation wizard
- Prompt generator
- JSON import with validation
- Dice roller
- Combat tracker
- Character sheets
- Scene viewer
- DM mode toggle

## Features Needed
- Encounter generator with SRD monsters
- Loot generator
- Character editing locked to DM mode only
- Invite code sharing
- Real-time multiplayer sync
- Better mobile responsiveness

## Design Rules
- Dark fantasy theme with gold accents
- DM-only info has dashed red border
- Big click targets (used at gaming table)
- Mobile responsive

## Git Workflow
After changes run: git add . && git commit -m "Description" && git push
Vercel auto-deploys in 30 seconds.

## Future Phases
- Phase 1 (NOW): Local DM tool with campaign import
- Phase 2: Multiplayer online (players connect remotely)
- Phase 3: VR tabletop