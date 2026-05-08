# blvck0ut Economy System — "Souls"

## Overview
A full gothic-themed economy system built natively into blvck0ut. No external bots needed. Everything uses rich embeds, fits the dark/vampire aesthetic, and is designed to be **grindy** (low earnings, high prices) to keep members active.

---

## Currency Details
- **Name:** souls
- **Icon:** `<:souls:1473022445559746612>`
- **Starting balance:** 5,000 souls
- **Daily reward:** 250 souls

---

## Database Schema (new tables in database.js)

### `economy_users` — Core balance tracking
| Column | Type | Notes |
|--------|------|-------|
| guild_id | TEXT | |
| user_id | TEXT | |
| balance | INTEGER | Default 5000 |
| bank | INTEGER | Default 0 |
| total_earned | INTEGER | Lifetime stat |
| total_spent | INTEGER | Lifetime stat |
| last_daily | TEXT | ISO timestamp |
| last_work | TEXT | ISO timestamp |
| last_crime | TEXT | ISO timestamp |
| last_rob | TEXT | ISO timestamp |
| last_chat_earn | TEXT | ISO timestamp |
| PRIMARY KEY | (guild_id, user_id) | |

### `economy_inventory` — User-owned items
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK AUTOINCREMENT |
| guild_id | TEXT | |
| user_id | TEXT | |
| item_id | TEXT | References shop_items |
| acquired_at | DATETIME | |

### `economy_shop` — Configurable shop items
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK AUTOINCREMENT |
| guild_id | TEXT | |
| item_id | TEXT | Unique slug |
| name | TEXT | Display name |
| description | TEXT | |
| price | INTEGER | |
| type | TEXT | 'role' or 'item' |
| role_id | TEXT | NULL if type='item' |
| stock | INTEGER | -1 for unlimited |
| is_active | INTEGER | 1=visible, 0=hidden |

### `economy_transactions` — Audit log
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK AUTOINCREMENT |
| guild_id | TEXT | |
| user_id | TEXT | |
| type | TEXT | daily/work/crime/gamble/give/buy/rob/fine/chat/pick |
| amount | INTEGER | + or - |
| details | TEXT | JSON or description |
| created_at | DATETIME | |

---

## Gothic Shop Roles (15 roles, escalating prices)

These are the role names + prices for Kiyomie to create in Discord. Prices scale from affordable to insane grind territory:

| # | Role Name | Price | Tier |
|---|-----------|-------|------|
| 1 | ⚰️ Freshly Buried | 2,500 | Starter |
| 2 | 🕷️ Crypt Lurker | 7,500 | Starter |
| 3 | 🕯️ Candlelit Whisper | 15,000 | Low |
| 4 | 🌑 Moonless Wanderer | 35,000 | Low |
| 5 | 🦇 Nightborn | 75,000 | Mid |
| 6 | 🗡️ Bloodsworn | 150,000 | Mid |
| 7 | 🔮 Hex Weaver | 300,000 | Mid |
| 8 | 💀 Gravecaller | 500,000 | High |
| 9 | ⛓️ Soulbound | 850,000 | High |
| 10 | 🌹 Crimson Thorn | 1,500,000 | Elite |
| 11 | 🩸 Bloodletter | 3,000,000 | Elite |
| 12 | 👻 Phantom Sovereign | 6,000,000 | Legendary |
| 13 | 🦷 Fangkeeper | 10,000,000 | Legendary |
| 14 | 🖤 Void Reaper | 25,000,000 | Mythic |
| 15 | 👑 Eternal Nightlord | 50,000,000 | Mythic |

*With 250 daily + 5-15 per message + command earnings, the top role requires serious dedication.*

---

## Economy Commands (new `src/commands/economy/` folder)

### Core Commands
| Command | Description | Cooldown |
|---------|-------------|----------|
| `/balance` (`-bal`) | Check your or someone's soul balance | None |
| `/daily` (`-daily`) | Collect 250 souls daily | 24 hours |
| `/work` (`-work`) | Work a gothic job for 200-800 souls | 5 minutes |
| `/crime` (`-crime`) | Attempt a heist for 500-2000 souls (can fail and lose 300-800) | 10 minutes |
| `/give` (`-give`) | Transfer souls to another user (15% tax) | None |

### Gambling Commands
| Command | Description | Cooldown |
|---------|-------------|----------|
| `/coinflip` (`-cf`) | Bet 100-25,000 on heads/tails (1.8x payout) | 30 seconds |
| `/slots` (`-slots`) | Bet 100-25,000 on slot machine (various multipliers) | 45 seconds |
| `/dice` (`-dice`) | Bet 100-25,000, roll higher than bot to win (2x payout) | 30 seconds |

### Shop Commands
| Command | Description | Cooldown |
|---------|-------------|----------|
| `/shop` (`-shop`) | View the soul shop with pages | None |
| `/buy` (`-buy`) | Purchase a role/item from the shop | None |
| `/inventory` (`-inv`) | View your owned items | None |

### Utility Commands
| Command | Description | Cooldown |
|---------|-------------|----------|
| `/leaderboard` (`-lb`) | Top 10 richest members | None |
| `/cooldowns` (`-cd`) | Check all your active cooldowns | None |
| `/pick` (`-pick`) | Pick up randomly spawned soul drops | None (event-based) |

### Admin/Mod Commands (inside economy commands with permission checks)
| Command | Description |
|---------|-------------|
| `/economy give <user> <amount>` | Admin: give souls to a user |
| `/economy take <user> <amount>` | Admin: remove souls from a user |
| `/economy reset <user>` | Admin: reset a user's economy |
| `/economy setshop` | Admin: add/remove/edit shop items |

---

## Passive Earning System

### Chat Earnings (in messageCreate.js)
- Earn **5-15 souls** per message
- **30-second cooldown** between earnings
- Only in allowed channels (not bot-command channels)
- Silent — no notification, just adds to balance
- Tracked via `last_chat_earn` timestamp

### Soul Drops (random /pick events)
- Random chance (configurable, e.g., 1 in 50 messages) to spawn a soul drop in the channel
- Bot posts: "💀 **A lost soul has appeared!** Use `/pick` to claim it!"
- First person to `/pick` gets 100-1,000 souls
- Drop expires after 30 seconds
- Creates engagement and excitement

---

## Profanity Fine System
- When automod detects a banned word → deduct **500 souls** from the offender
- Sends embed in channel: "You lost 500 souls for using forbidden words"
- Integrates with existing `word_filter` table
- Added to `messageCreate.js` anti-invite/automod section

---

## Economy Helper Utility (`src/utils/economy.js`)
Centralized functions:
- `getUser(guildId, userId)` — get or create economy profile (auto-creates with 5000 starting balance)
- `addSouls(guildId, userId, amount, type, details)` — add souls + log transaction
- `removeSouls(guildId, userId, amount, type, details)` — remove souls + log transaction
- `transferSouls(guildId, fromId, toId, amount)` — transfer with 15% tax + log
- `formatSouls(amount)` — returns formatted string like `<:souls:1473022445559746612> 5,000`
- `checkCooldown(guildId, userId, action, cooldownMs)` — returns remaining time or null
- `setCooldown(guildId, userId, action)` — updates the timestamp

---

## File Creation Summary

### New files to create:
1. `src/utils/economy.js` — Economy helper utility
2. `src/commands/economy/balance.js` — Balance command
3. `src/commands/economy/daily.js` — Daily reward
4. `src/commands/economy/work.js` — Work command
5. `src/commands/economy/crime.js` — Crime command
6. `src/commands/economy/give.js` — Transfer souls
7. `src/commands/economy/coinflip.js` — Coinflip gambling
8. `src/commands/economy/slots.js` — Slots gambling
9. `src/commands/economy/dice.js` — Dice gambling
10. `src/commands/economy/shop.js` — View shop
11. `src/commands/economy/buy.js` — Buy from shop
12. `src/commands/economy/inventory.js` — View inventory
13. `src/commands/economy/leaderboard.js` — Top 10 richest
14. `src/commands/economy/cooldowns.js` — View cooldowns
15. `src/commands/economy/pick.js` — Pick up soul drops
16. `src/commands/economy/economyadmin.js` — Admin subcommands (give/take/reset/setshop)

### Files to modify:
1. `src/data/database.js` — Add 4 new tables + indexes
2. `src/events/messageCreate.js` — Add passive chat earnings + profanity fines + soul drop spawns
3. `deploy-commands.js` — Auto-discovers new commands (no changes needed actually)

---

## What YOU Need To Do (Manual Discord Setup)

Before or after I build this, you'll need to:

1. **Create a shop channel** — e.g., `#soul-shop` — where the bot will display the shop
2. **Create the 15 shop roles** in Discord with the names from the table above (Kiyomie can help with this + colors/icons)
3. **Give me the role IDs** after creating them so I can seed the shop database
4. **Optionally create an economy channel** — e.g., `#soul-grind` — where gambling/economy commands are allowed

---

## Design Philosophy
- **All responses in rich embeds** — no plain text, everything looks professional
- **Gothic themed** — skull emojis, dark descriptions, vampire flavor text
- **Grindy by design** — 250 daily, 5-15 per message, 200-800 per work, but top role costs 50M
- **Multiple currency sinks** — shop roles, gambling losses, transfer tax, profanity fines
- **Engagement loops** — random soul drops, short cooldowns on commands, passive chat earnings
