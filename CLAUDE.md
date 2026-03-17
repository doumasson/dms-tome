# DM's Tome

## What Is This
A multiplayer D&D 5e campaign management app. Users sign in with Google, create or join campaigns, and play together.

## Tech Stack
- React + Vite
- Zustand (state management)
- Supabase (auth + database)
- Vercel (hosting)

## Supabase Credentials
- URL: https://pmipauucnlhhdfuylrfi.supabase.co
- Anon Key: sb_publishable_lqnd4y7vphubYwXxP2A41w_O606A2PJ
- Google OAuth configured

## Database Tables
- users (id, email, name, avatar_url, created_at)
- campaigns (id, name, dm_user_id, invite_code, campaign_data, created_at, updated_at)
- campaign_members (id, campaign_id, user_id, role [dm/player], character_data, joined_at)

## User Flows
1. User signs in with Google
2. Sees campaign select screen (create or join)
3. DM creates campaign, gets prompt wizard, imports JSON, shares invite link
4. Players join via link, upload/create character
5. Everyone plays - DM sees everything, players see their view

## Features
- Dice roller (all dice, advantage/disadvantage, modifiers)
- Combat tracker (initiative, HP, AC, attacks, encounter generator)
- Character sheets (editable by DM, viewable by players)
- Scene viewer (story text, choices, DM notes hidden from players)
- Campaign importer (paste JSON, validate, load)
- DM mode toggle (show/hide secrets)
- SRD monster database for encounter generation
- Loot generator

## Design Rules
- Dark fantasy theme with gold accents (#ffd700)
- DM-only info has dashed red border
- Big click targets (used at gaming table)
- Mobile responsive

## Current Status
- Basic app built
- Supabase auth in progress
- Need: database tables, campaign flow, multiplayer sync