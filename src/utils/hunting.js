// ─── Monster Hunting Core Logic ───
// DB operations, multi-catch encounter system, XP, resources, lootboxes.
// Mirrors the pattern in economy.js (prepared statements at top, exported functions).

const db = require('../data/database');
const { MONSTERS, RARITY_ORDER, RARITY_CONFIG, SPAWN_WEIGHTS, CATCH_RATES, getMonstersByRarity, findMonsterByName } = require('../data/monsters');
const { HUNT_ITEMS, ITEM_RARITY_ORDER, ITEM_RARITY_CONFIG, ITEM_DROP_CHANCE, ITEM_RARITY_WEIGHTS, getItemsByRarity, findItemByName } = require('../data/huntItems');
const { getMonsterEmoji } = require('./monsterEmojis');

// ─── Config ───
const HUNT_COOLDOWN = 10 * 1000; // 10 seconds

// Multi-catch
const BASE_CATCH_MIN = 5;
const BASE_CATCH_MAX = 10;
const MAX_CATCH_WITH_BOOSTS = 15;

// Resources
const BLOOD_SHARD_MAX = 100;
const BONE_FRAGMENT_MAX = 800;
const BLOOD_SHARD_DROP_CHANCE = 0.15;   // 15% per hunt to get 1-3
const BONE_FRAGMENT_DROP_CHANCE = 0.10; // 10% per hunt to get 1-5

// XP per rarity
const XP_PER_RARITY = { common: 2, uncommon: 5, rare: 12, epic: 25, legendary: 60 };
const LEVEL_XP_BASE = 100;    // XP needed for level 1
const LEVEL_XP_SCALE = 1.15;  // Each level requires 15% more

// Lootbox
const LOOTBOX_CHANCE = 0.10;      // 10% per hunt
const LOOTBOX_DAILY_LIMIT = 3;
const LOOTBOX_RESET_HOURS = 24;

// ─── Prepared Statements ───
const ensureProfileStmt = db.prepare(`
    INSERT OR IGNORE INTO hunt_profile (guild_id, user_id) VALUES (?, ?)
`);
const getProfileStmt = db.prepare(`
    SELECT * FROM hunt_profile WHERE guild_id = ? AND user_id = ?
`);
const setLastHuntStmt = db.prepare(`
    UPDATE hunt_profile SET last_hunt = ? WHERE guild_id = ? AND user_id = ?
`);
const incrementCaughtStmt = db.prepare(`
    UPDATE hunt_profile SET total_caught = total_caught + 1 WHERE guild_id = ? AND user_id = ?
`);
const incrementCaughtByStmt = db.prepare(`
    UPDATE hunt_profile SET total_caught = total_caught + ? WHERE guild_id = ? AND user_id = ?
`);
const incrementSoldStmt = db.prepare(`
    UPDATE hunt_profile SET total_sold = total_sold + 1 WHERE guild_id = ? AND user_id = ?
`);
const incrementSoldByStmt = db.prepare(`
    UPDATE hunt_profile SET total_sold = total_sold + ? WHERE guild_id = ? AND user_id = ?
`);

// Collection
const insertMonsterStmt = db.prepare(`
    INSERT INTO hunt_collection (guild_id, user_id, monster_id, hp, attack, defense)
    VALUES (?, ?, ?, ?, ?, ?)
`);
const deleteOldestMonsterStmt = db.prepare(`
    DELETE FROM hunt_collection WHERE id = (
        SELECT id FROM hunt_collection
        WHERE guild_id = ? AND user_id = ? AND monster_id = ?
        ORDER BY caught_at ASC LIMIT 1
    )
`);
const getCollectionGroupedStmt = db.prepare(`
    SELECT monster_id, COUNT(*) as count
    FROM hunt_collection WHERE guild_id = ? AND user_id = ?
    GROUP BY monster_id
`);
const getMonsterCountStmt = db.prepare(`
    SELECT COUNT(*) as count FROM hunt_collection
    WHERE guild_id = ? AND user_id = ? AND monster_id = ?
`);
const getTotalCountStmt = db.prepare(`
    SELECT COUNT(*) as count FROM hunt_collection WHERE guild_id = ? AND user_id = ?
`);
const getUniqueCountStmt = db.prepare(`
    SELECT COUNT(DISTINCT monster_id) as count FROM hunt_collection
    WHERE guild_id = ? AND user_id = ?
`);
const getDiscoveredMonstersStmt = db.prepare(`
    SELECT DISTINCT monster_id FROM hunt_collection WHERE guild_id = ? AND user_id = ?
`);

// Resources
const updateResourcesStmt = db.prepare(`
    UPDATE hunt_profile SET blood_shards = ?, bone_fragments = ?
    WHERE guild_id = ? AND user_id = ?
`);

// XP + Level
const updateHuntXpStmt = db.prepare(`
    UPDATE hunt_profile SET hunt_xp = ?, hunt_level = ?
    WHERE guild_id = ? AND user_id = ?
`);

// Lootbox
const addLootboxStmt = db.prepare(`
    UPDATE hunt_profile SET lootboxes = lootboxes + 1, lootboxes_today = lootboxes_today + 1
    WHERE guild_id = ? AND user_id = ?
`);
const openLootboxStmt = db.prepare(`
    UPDATE hunt_profile SET lootboxes = lootboxes - 1
    WHERE guild_id = ? AND user_id = ? AND lootboxes > 0
`);
const resetDailyLootboxStmt = db.prepare(`
    UPDATE hunt_profile SET lootboxes_today = 0, lootbox_reset = ?
    WHERE guild_id = ? AND user_id = ?
`);

// ─── Profile Management ───
function ensureHuntProfile(guildId, userId) {
    ensureProfileStmt.run(guildId, userId);
    return getProfileStmt.get(guildId, userId);
}

function getHuntProfile(guildId, userId) {
    return getProfileStmt.get(guildId, userId);
}

// ─── Cooldowns ───
function checkHuntCooldown(guildId, userId) {
    const profile = getProfileStmt.get(guildId, userId);
    if (!profile || !profile.last_hunt) return 0;

    const lastHunt = new Date(profile.last_hunt).getTime();
    const elapsed = Date.now() - lastHunt;
    return elapsed >= HUNT_COOLDOWN ? 0 : HUNT_COOLDOWN - elapsed;
}

function setHuntCooldown(guildId, userId) {
    setLastHuntStmt.run(new Date().toISOString(), guildId, userId);
}

// ─── Multi-Catch Encounter Logic ───
function rollMultiEncounter(profile) {
    // Determine catch count
    // Base: 5-10, +1 per 20 blood shards (up to +5 extra = max 15)
    const bloodBonus = Math.floor((profile.blood_shards || 0) / 20);
    const min = BASE_CATCH_MIN;
    const max = Math.min(BASE_CATCH_MAX + bloodBonus, MAX_CATCH_WITH_BOOSTS);
    const catchCount = Math.floor(Math.random() * (max - min + 1)) + min;

    // Determine rarity weights (bone fragments boost rare+ rates slightly)
    const boneBoost = (profile.bone_fragments || 0) / BONE_FRAGMENT_MAX; // 0.0 - 1.0
    const adjustedWeights = { ...SPAWN_WEIGHTS };
    // Shift weight from common to rarer tiers (up to 5% shift max)
    const shiftAmount = boneBoost * 0.05;
    adjustedWeights.common = Math.max(0.30, adjustedWeights.common - shiftAmount);
    adjustedWeights.uncommon += shiftAmount * 0.45;
    adjustedWeights.rare += shiftAmount * 0.30;
    adjustedWeights.epic += shiftAmount * 0.15;
    adjustedWeights.legendary += shiftAmount * 0.10;

    // Roll each monster
    const catches = [];
    for (let i = 0; i < catchCount; i++) {
        const roll = Math.random();
        let cumulative = 0;
        let selectedRarity = 'common';

        for (const rarity of RARITY_ORDER) {
            cumulative += adjustedWeights[rarity];
            if (roll < cumulative) {
                selectedRarity = rarity;
                break;
            }
        }

        const pool = getMonstersByRarity(selectedRarity);
        const monster = pool[Math.floor(Math.random() * pool.length)];

        // Apply catch rate — higher rarity = harder to catch
        const catchRoll = Math.random();
        if (catchRoll < CATCH_RATES[selectedRarity]) {
            catches.push({ monster, rarity: selectedRarity, caught: true });
        } else {
            catches.push({ monster, rarity: selectedRarity, caught: false });
        }
    }

    // Sort: common first, legendary last (visual rarity gradient like OwO)
    catches.sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));

    return catches;
}

// Legacy single encounter (kept for backward compat)
function rollEncounter() {
    const roll = Math.random();
    let cumulative = 0;
    let selectedRarity = 'common';

    for (const rarity of RARITY_ORDER) {
        cumulative += SPAWN_WEIGHTS[rarity];
        if (roll < cumulative) {
            selectedRarity = rarity;
            break;
        }
    }

    const pool = getMonstersByRarity(selectedRarity);
    const monster = pool[Math.floor(Math.random() * pool.length)];

    return { monster, rarity: selectedRarity };
}

function rollCatch(rarity) {
    return Math.random() < CATCH_RATES[rarity];
}

// ─── Collection CRUD ───
function addToCollection(guildId, userId, monsterId) {
    const monster = MONSTERS[monsterId];
    if (!monster) return null;

    insertMonsterStmt.run(guildId, userId, monsterId, monster.hp, monster.attack, monster.defense);
    incrementCaughtStmt.run(guildId, userId);
    return true;
}

// Bulk add from multi-catch (single transaction for performance)
const bulkAddTransaction = db.transaction((guildId, userId, catches) => {
    for (const { monster } of catches) {
        insertMonsterStmt.run(guildId, userId, monster.id, monster.hp, monster.attack, monster.defense);
    }
    incrementCaughtByStmt.run(catches.length, guildId, userId);
});

function bulkAddToCollection(guildId, userId, catches) {
    bulkAddTransaction(guildId, userId, catches);
}

function removeFromCollection(guildId, userId, monsterId) {
    const result = deleteOldestMonsterStmt.run(guildId, userId, monsterId);
    return result.changes > 0;
}

function getCollection(guildId, userId) {
    return getCollectionGroupedStmt.all(guildId, userId);
}

function getMonsterCount(guildId, userId, monsterId) {
    const row = getMonsterCountStmt.get(guildId, userId, monsterId);
    return row ? row.count : 0;
}

function getTotalCount(guildId, userId) {
    const row = getTotalCountStmt.get(guildId, userId);
    return row ? row.count : 0;
}

function getUniqueCount(guildId, userId) {
    const row = getUniqueCountStmt.get(guildId, userId);
    return row ? row.count : 0;
}

function getDiscoveredMonsters(guildId, userId) {
    return getDiscoveredMonstersStmt.all(guildId, userId).map(r => r.monster_id);
}

// ─── XP System ───
function calculateHuntXp(catches) {
    let total = 0;
    for (const c of catches) {
        total += XP_PER_RARITY[c.rarity] || 0;
    }
    return total;
}

function getXpForLevel(level) {
    return Math.floor(LEVEL_XP_BASE * Math.pow(LEVEL_XP_SCALE, level));
}

function addHuntXp(guildId, userId, xpAmount) {
    const profile = getProfileStmt.get(guildId, userId);
    let currentXp = (profile.hunt_xp || 0) + xpAmount;
    let currentLevel = profile.hunt_level || 0;
    let leveledUp = false;

    // Check for level ups
    while (true) {
        const xpNeeded = getXpForLevel(currentLevel);
        if (currentXp >= xpNeeded) {
            currentXp -= xpNeeded;
            currentLevel++;
            leveledUp = true;
        } else {
            break;
        }
    }

    updateHuntXpStmt.run(currentXp, currentLevel, guildId, userId);
    return { newXp: currentXp, newLevel: currentLevel, leveledUp };
}

// ─── Resource System ───
function rollResourceDrops() {
    const drops = { bloodShards: 0, boneFragments: 0 };

    if (Math.random() < BLOOD_SHARD_DROP_CHANCE) {
        drops.bloodShards = Math.floor(Math.random() * 3) + 1; // 1-3
    }
    if (Math.random() < BONE_FRAGMENT_DROP_CHANCE) {
        drops.boneFragments = Math.floor(Math.random() * 5) + 1; // 1-5
    }

    return drops;
}

function addResources(guildId, userId, bloodShards, boneFragments) {
    const profile = getProfileStmt.get(guildId, userId);
    const newBlood = (profile.blood_shards || 0) + bloodShards;
    const newBone = (profile.bone_fragments || 0) + boneFragments;
    updateResourcesStmt.run(newBlood, newBone, guildId, userId);
    return { bloodShards: newBlood, boneFragments: newBone };
}

// ─── Lootbox System ───
function checkLootboxDrop(guildId, userId) {
    const profile = getProfileStmt.get(guildId, userId);

    // Check daily reset
    if (profile.lootbox_reset) {
        const resetTime = new Date(profile.lootbox_reset).getTime();
        if (Date.now() >= resetTime) {
            resetDailyLootboxStmt.run(
                new Date(Date.now() + LOOTBOX_RESET_HOURS * 3600000).toISOString(),
                guildId, userId,
            );
            const updated = getProfileStmt.get(guildId, userId);
            return tryLootboxDrop(guildId, userId, updated);
        }
    } else {
        // First time — set reset time
        resetDailyLootboxStmt.run(
            new Date(Date.now() + LOOTBOX_RESET_HOURS * 3600000).toISOString(),
            guildId, userId,
        );
        const updated = getProfileStmt.get(guildId, userId);
        return tryLootboxDrop(guildId, userId, updated);
    }

    return tryLootboxDrop(guildId, userId, profile);
}

function tryLootboxDrop(guildId, userId, profile) {
    if ((profile.lootboxes_today || 0) >= LOOTBOX_DAILY_LIMIT) {
        return null; // Already hit daily limit
    }
    if (Math.random() >= LOOTBOX_CHANCE) {
        return null; // Did not roll lootbox
    }

    addLootboxStmt.run(guildId, userId);

    // Calculate time remaining until reset
    const resetTime = profile.lootbox_reset ? new Date(profile.lootbox_reset).getTime() : Date.now() + LOOTBOX_RESET_HOURS * 3600000;
    const remaining = Math.max(0, resetTime - Date.now());

    return {
        count: (profile.lootboxes_today || 0) + 1,
        limit: LOOTBOX_DAILY_LIMIT,
        resetRemaining: remaining,
    };
}

function openLootbox(guildId, userId) {
    const profile = getProfileStmt.get(guildId, userId);
    if (!profile || (profile.lootboxes || 0) <= 0) return null;

    const result = openLootboxStmt.run(guildId, userId);
    if (result.changes === 0) return null;

    // Generate lootbox contents
    const contents = {
        monsters: [],
        bloodShards: 0,
        boneFragments: 0,
        souls: 0,
    };

    // 2-5 monsters (weighted toward uncommon+)
    const monsterCount = Math.floor(Math.random() * 4) + 2;
    const lootWeights = {
        common: 0.25, uncommon: 0.35, rare: 0.25, epic: 0.12, legendary: 0.03,
    };
    for (let i = 0; i < monsterCount; i++) {
        const roll = Math.random();
        let cumulative = 0;
        let rarity = 'common';
        for (const r of RARITY_ORDER) {
            cumulative += lootWeights[r];
            if (roll < cumulative) { rarity = r; break; }
        }
        const pool = getMonstersByRarity(rarity);
        const monster = pool[Math.floor(Math.random() * pool.length)];
        addToCollection(guildId, userId, monster.id);
        contents.monsters.push({ monster, rarity });
    }

    // 5-15 blood shards
    contents.bloodShards = Math.floor(Math.random() * 11) + 5;
    // 2-10 bone fragments
    contents.boneFragments = Math.floor(Math.random() * 9) + 2;
    // 100-500 souls
    contents.souls = Math.floor(Math.random() * 401) + 100;

    // Apply resources
    addResources(guildId, userId, contents.bloodShards, contents.boneFragments);

    return contents;
}

// ─── Selling ───
function rollSellValue(monsterId) {
    const monster = MONSTERS[monsterId];
    if (!monster) return 0;
    return Math.floor(Math.random() * (monster.sellMax - monster.sellMin + 1)) + monster.sellMin;
}

const sellTransaction = db.transaction((guildId, userId, monsterId) => {
    // Delete oldest copy
    const deleted = deleteOldestMonsterStmt.run(guildId, userId, monsterId);
    if (deleted.changes === 0) return null;

    // Increment sold count
    incrementSoldStmt.run(guildId, userId);

    return true;
});

function sellMonster(guildId, userId, monsterId) {
    return sellTransaction(guildId, userId, monsterId);
}

// ─── Get team monster collection IDs (to protect from selling) ───
const getTeamMonsterIdsStmt = db.prepare(`
    SELECT monster_collection_id FROM hunt_teams
    WHERE guild_id = ? AND user_id = ? AND monster_collection_id IS NOT NULL
`);

function getTeamMonsterCollectionIds(guildId, userId) {
    return getTeamMonsterIdsStmt.all(guildId, userId).map(r => r.monster_collection_id);
}

// ─── Get all collection entries for a rarity (individual rows, not grouped) ───
const getCollectionByRarityStmt = db.prepare(`
    SELECT hc.id, hc.monster_id FROM hunt_collection hc
    WHERE hc.guild_id = ? AND hc.user_id = ? AND hc.monster_id IN (
        SELECT DISTINCT monster_id FROM hunt_collection WHERE guild_id = ? AND user_id = ?
    )
    ORDER BY hc.caught_at ASC
`);

/**
 * Bulk sell all monsters of given rarities, skipping any on the team.
 * @param {string} guildId
 * @param {string} userId
 * @param {string[]} rarities - e.g. ['common'] or ['common','uncommon','rare','epic','legendary']
 * @returns {{ totalSold: number, totalValue: number, breakdown: Object }}
 */
const deleteCollectionByIdStmt = db.prepare('DELETE FROM hunt_collection WHERE id = ?');

const bulkSellByRarity = db.transaction((guildId, userId, rarities) => {
    // Get team monster IDs to protect
    const teamIds = new Set(getTeamMonsterCollectionIds(guildId, userId));

    // Get all collection entries
    const allEntries = getCollectionByRarityStmt.all(guildId, userId, guildId, userId);

    // Filter to target rarities, skip team monsters
    const targetMonsterIds = new Set();
    for (const r of rarities) {
        for (const m of getMonstersByRarity(r)) {
            targetMonsterIds.add(m.id);
        }
    }

    const toSell = allEntries.filter(e =>
        targetMonsterIds.has(e.monster_id) && !teamIds.has(e.id)
    );

    if (toSell.length === 0) return { totalSold: 0, totalValue: 0, breakdown: {}, skippedTeam: teamIds.size > 0 };

    let totalValue = 0;
    const breakdown = {}; // { rarity: { count, value } }

    for (const entry of toSell) {
        const monster = MONSTERS[entry.monster_id];
        if (!monster) continue;

        const value = rollSellValue(entry.monster_id);
        deleteCollectionByIdStmt.run(entry.id);
        totalValue += value;

        if (!breakdown[monster.rarity]) breakdown[monster.rarity] = { count: 0, value: 0 };
        breakdown[monster.rarity].count++;
        breakdown[monster.rarity].value += value;
    }

    // Update sold count
    incrementSoldByStmt.run(toSell.length, guildId, userId);

    return { totalSold: toSell.length, totalValue, breakdown, skippedTeam: teamIds.size > 0 };
});

// ─── Formatting Helpers ───
function formatMonsterLine(monsterId, count) {
    const monster = MONSTERS[monsterId];
    if (!monster) return `❓ Unknown ×${count}`;
    const emoji = getMonsterEmoji(monsterId, monster.fallbackEmoji);
    return `${emoji} ${monster.name} ×${count}`;
}

function formatRarityLabel(rarity) {
    const cfg = RARITY_CONFIG[rarity];
    if (!cfg) return rarity;
    return `${cfg.emoji} **${cfg.label}** ${cfg.stars}`;
}

function formatStats(monster) {
    return `❤️ ${monster.hp} HP  |  ⚔️ ${monster.attack} ATK  |  🛡️ ${monster.defense} DEF`;
}

// ─── Escape Messages (legacy, kept for compat) ───
const ESCAPE_MESSAGES = [
    'It vanished into the fog before you could act.',
    'It slipped through your fingers like smoke.',
    'The creature dissolved into shadow and was gone.',
    'It snarled and fled into the darkness.',
    'Your trap shattered — it was too powerful.',
    'It phased through the wall and disappeared.',
    'The darkness swallowed it whole before you could move.',
    'It was faster than you. Much faster.',
];

function getRandomEscapeMessage() {
    return ESCAPE_MESSAGES[Math.floor(Math.random() * ESCAPE_MESSAGES.length)];
}

// ─── Item System ───
const insertItemStmt = db.prepare(`
    INSERT INTO hunt_items (guild_id, user_id, item_id) VALUES (?, ?, ?)
`);
const getUserItemsStmt = db.prepare(`
    SELECT item_id, COUNT(*) as count
    FROM hunt_items WHERE guild_id = ? AND user_id = ?
    GROUP BY item_id
`);
const getItemCountStmt = db.prepare(`
    SELECT COUNT(*) as count FROM hunt_items
    WHERE guild_id = ? AND user_id = ? AND item_id = ?
`);
const deleteOldestItemStmt = db.prepare(`
    DELETE FROM hunt_items WHERE id = (
        SELECT id FROM hunt_items
        WHERE guild_id = ? AND user_id = ? AND item_id = ?
        ORDER BY found_at ASC LIMIT 1
    )
`);
const getTotalItemCountStmt = db.prepare(`
    SELECT COUNT(*) as count FROM hunt_items WHERE guild_id = ? AND user_id = ?
`);

function rollItemDrop() {
    if (Math.random() >= ITEM_DROP_CHANCE) return null;

    // Pick rarity
    const roll = Math.random();
    let cumulative = 0;
    let selectedRarity = 'common';
    for (const rarity of ITEM_RARITY_ORDER) {
        cumulative += ITEM_RARITY_WEIGHTS[rarity];
        if (roll < cumulative) {
            selectedRarity = rarity;
            break;
        }
    }

    const pool = getItemsByRarity(selectedRarity);
    const item = pool[Math.floor(Math.random() * pool.length)];
    return item;
}

function addItemToInventory(guildId, userId, itemId) {
    insertItemStmt.run(guildId, userId, itemId);
}

function getUserItems(guildId, userId) {
    return getUserItemsStmt.all(guildId, userId);
}

function getItemCount(guildId, userId, itemId) {
    const row = getItemCountStmt.get(guildId, userId, itemId);
    return row ? row.count : 0;
}

function getTotalItemCount(guildId, userId) {
    const row = getTotalItemCountStmt.get(guildId, userId);
    return row ? row.count : 0;
}

function removeItem(guildId, userId, itemId) {
    const result = deleteOldestItemStmt.run(guildId, userId, itemId);
    return result.changes > 0;
}

function rollItemSellValue(itemId) {
    const item = HUNT_ITEMS[itemId];
    if (!item) return 0;
    return Math.floor(Math.random() * (item.sellMax - item.sellMin + 1)) + item.sellMin;
}

// ─── Time Formatting ───
function formatTimeRemaining(ms) {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${String(hours).padStart(2, '0')}H ${String(mins).padStart(2, '0')}M ${String(secs).padStart(2, '0')}S`;
}

// ─── Team Management ───
const ensureTeamSlotsStmt = db.prepare(`
    INSERT OR IGNORE INTO hunt_teams (guild_id, user_id, slot) VALUES (?, ?, ?)
`);
const getTeamStmt = db.prepare(`
    SELECT ht.slot, ht.monster_collection_id, ht.equipped_item_id,
           hc.monster_id, hc.level, hc.xp, hc.hp, hc.attack, hc.defense, hc.nickname,
           hi.item_id AS eq_item_id
    FROM hunt_teams ht
    LEFT JOIN hunt_collection hc ON ht.monster_collection_id = hc.id
    LEFT JOIN hunt_items hi ON ht.equipped_item_id = hi.id
    WHERE ht.guild_id = ? AND ht.user_id = ?
    ORDER BY ht.slot ASC
`);
const setTeamSlotStmt = db.prepare(`
    UPDATE hunt_teams SET monster_collection_id = ? WHERE guild_id = ? AND user_id = ? AND slot = ?
`);
const clearTeamSlotStmt = db.prepare(`
    UPDATE hunt_teams SET monster_collection_id = NULL, equipped_item_id = NULL
    WHERE guild_id = ? AND user_id = ? AND slot = ?
`);
const equipItemStmt = db.prepare(`
    UPDATE hunt_teams SET equipped_item_id = ? WHERE guild_id = ? AND user_id = ? AND slot = ?
`);
const unequipItemStmt = db.prepare(`
    UPDATE hunt_teams SET equipped_item_id = NULL WHERE guild_id = ? AND user_id = ? AND slot = ?
`);
const getBestMonsterStmt = db.prepare(`
    SELECT id, monster_id, hp, attack, defense, level, xp, nickname
    FROM hunt_collection
    WHERE guild_id = ? AND user_id = ? AND monster_id = ?
    ORDER BY (hp + attack + defense) DESC
    LIMIT 1
`);
const isMonsterOnTeamStmt = db.prepare(`
    SELECT slot FROM hunt_teams
    WHERE guild_id = ? AND user_id = ? AND monster_collection_id = ?
`);
const isItemEquippedStmt = db.prepare(`
    SELECT slot FROM hunt_teams
    WHERE guild_id = ? AND user_id = ? AND equipped_item_id = ?
`);
const getSpecificItemStmt = db.prepare(`
    SELECT id, item_id FROM hunt_items
    WHERE guild_id = ? AND user_id = ? AND item_id = ?
    ORDER BY found_at ASC LIMIT 1
`);
const deleteItemByIdStmt = db.prepare(`
    DELETE FROM hunt_items WHERE id = ?
`);
const getUnequippedItemStmt = db.prepare(`
    SELECT hi.id, hi.item_id FROM hunt_items hi
    WHERE hi.guild_id = ? AND hi.user_id = ? AND hi.item_id = ?
    AND hi.id NOT IN (SELECT equipped_item_id FROM hunt_teams WHERE guild_id = ? AND user_id = ? AND equipped_item_id IS NOT NULL)
    ORDER BY hi.found_at ASC LIMIT 1
`);

// Battle stats
const updateBattleWinStmt = db.prepare(`
    UPDATE hunt_profile
    SET battles_won = battles_won + 1, battle_streak = battle_streak + 1, last_battle = ?
    WHERE guild_id = ? AND user_id = ?
`);
const updateBattleLossStmt = db.prepare(`
    UPDATE hunt_profile
    SET battles_lost = battles_lost + 1, battle_streak = 0, last_battle = ?
    WHERE guild_id = ? AND user_id = ?
`);

function ensureTeamSlots(guildId, userId) {
    for (let slot = 1; slot <= 3; slot++) {
        ensureTeamSlotsStmt.run(guildId, userId, slot);
    }
}

function getTeam(guildId, userId) {
    ensureTeamSlots(guildId, userId);
    return getTeamStmt.all(guildId, userId);
}

function setTeamSlot(guildId, userId, slot, monsterId) {
    if (slot < 1 || slot > 3) return { success: false, error: 'Slot must be 1, 2, or 3.' };

    ensureTeamSlots(guildId, userId);

    // Find the best copy of this monster the user owns
    const best = getBestMonsterStmt.get(guildId, userId, monsterId);
    if (!best) return { success: false, error: `You don't own any **${MONSTERS[monsterId]?.name || monsterId}**.` };

    // Check if this specific monster instance is already on another slot
    const existing = isMonsterOnTeamStmt.get(guildId, userId, best.id);
    if (existing && existing.slot !== slot) {
        return { success: false, error: `That monster is already assigned to slot **${existing.slot}**.` };
    }

    setTeamSlotStmt.run(best.id, guildId, userId, slot);
    return { success: true, monster: best };
}

function clearTeamSlot(guildId, userId, slot) {
    if (slot < 1 || slot > 3) return { success: false, error: 'Slot must be 1, 2, or 3.' };
    ensureTeamSlots(guildId, userId);

    // Get current slot data to clean up equipped item
    const team = getTeamStmt.all(guildId, userId);
    const slotData = team.find(t => t.slot === slot);
    if (slotData && slotData.equipped_item_id) {
        deleteItemByIdStmt.run(slotData.equipped_item_id);
    }

    clearTeamSlotStmt.run(guildId, userId, slot);
    return { success: true };
}

function equipItem(guildId, userId, slot, itemId) {
    if (slot < 1 || slot > 3) return { success: false, error: 'Slot must be 1, 2, or 3.' };

    ensureTeamSlots(guildId, userId);

    // Check slot has a monster
    const team = getTeamStmt.all(guildId, userId);
    const slotData = team.find(t => t.slot === slot);
    if (!slotData || !slotData.monster_collection_id) {
        return { success: false, error: `Slot **${slot}** is empty. Assign a monster first.` };
    }

    // Find an available (non-equipped) copy of the item
    const itemInstance = getUnequippedItemStmt.get(guildId, userId, itemId, guildId, userId);
    if (!itemInstance) return { success: false, error: `You don't have a **${HUNT_ITEMS[itemId]?.name || itemId}** available (not already equipped).` };

    // If current slot has an item, destroy the old one
    if (slotData.equipped_item_id) {
        deleteItemByIdStmt.run(slotData.equipped_item_id);
    }

    equipItemStmt.run(itemInstance.id, guildId, userId, slot);
    return { success: true, item: HUNT_ITEMS[itemId] };
}

function unequipItem(guildId, userId, slot) {
    if (slot < 1 || slot > 3) return { success: false, error: 'Slot must be 1, 2, or 3.' };

    ensureTeamSlots(guildId, userId);

    const team = getTeamStmt.all(guildId, userId);
    const slotData = team.find(t => t.slot === slot);
    if (!slotData || !slotData.equipped_item_id) {
        return { success: false, error: `Slot **${slot}** has no item equipped.` };
    }

    // Destroy the item
    deleteItemByIdStmt.run(slotData.equipped_item_id);
    unequipItemStmt.run(guildId, userId, slot);
    return { success: true };
}

function getEffectiveStats(monsterRow, equippedItemId) {
    let hp = monsterRow.hp || 0;
    let attack = monsterRow.attack || 0;
    let defense = monsterRow.defense || 0;

    let atkBonus = 0, defBonus = 0, hpBonus = 0;

    if (equippedItemId) {
        const item = HUNT_ITEMS[equippedItemId];
        if (item) {
            atkBonus = item.atk_bonus || 0;
            defBonus = item.def_bonus || 0;
            hpBonus = item.hp_bonus || 0;
            hp += hpBonus;
            attack += atkBonus;
            defense += defBonus;
        }
    }

    return { hp, attack, defense, maxHp: hp, atkBonus, defBonus, hpBonus };
}

// ─── Battle System ───
const BATTLE_COOLDOWN = 30 * 1000; // 30 seconds

function checkBattleCooldown(guildId, userId) {
    const profile = getProfileStmt.get(guildId, userId);
    if (!profile || !profile.last_battle) return 0;
    const last = new Date(profile.last_battle).getTime();
    const elapsed = Date.now() - last;
    return elapsed >= BATTLE_COOLDOWN ? 0 : BATTLE_COOLDOWN - elapsed;
}

function recordBattleWin(guildId, userId) {
    updateBattleWinStmt.run(new Date().toISOString(), guildId, userId);
}

function recordBattleLoss(guildId, userId) {
    updateBattleLossStmt.run(new Date().toISOString(), guildId, userId);
}

/**
 * Calculate damage for a single hit.
 * damage = max(1, atk - def/2) * variance(0.85-1.15), 10% crit for 1.5x
 */
function calculateDamage(attackStat, defenseStat) {
    const baseDamage = Math.max(1, attackStat - defenseStat / 2);
    const variance = 0.85 + Math.random() * 0.30;
    let damage = Math.floor(baseDamage * variance);
    const critical = Math.random() < 0.10;
    if (critical) damage = Math.floor(damage * 1.5);
    return { damage: Math.max(1, damage), critical };
}

/**
 * Simulate a full PvP battle between two teams.
 * Each team: array of { slot, monsterId, name, emoji, hp, maxHp, attack, defense }
 * Returns { winner: 'challenger'|'defender', turns: [...], totalTurns }
 */
function simulateBattle(challengerTeam, defenderTeam) {
    const turns = [];
    let cIdx = 0;
    let dIdx = 0;

    // Clone HP values
    const cTeam = challengerTeam.map(m => ({ ...m, currentHp: m.hp }));
    const dTeam = defenderTeam.map(m => ({ ...m, currentHp: m.hp }));

    let turnCount = 0;
    const MAX_TURNS = 50;

    while (cIdx < cTeam.length && dIdx < dTeam.length && turnCount < MAX_TURNS) {
        turnCount++;
        const mon1 = cTeam[cIdx];
        const mon2 = dTeam[dIdx];

        // Higher ATK goes first, tie = random
        let first, second, firstSide, secondSide;
        if (mon1.attack > mon2.attack) {
            first = mon1; second = mon2; firstSide = 'challenger'; secondSide = 'defender';
        } else if (mon2.attack > mon1.attack) {
            first = mon2; second = mon1; firstSide = 'defender'; secondSide = 'challenger';
        } else {
            if (Math.random() < 0.5) {
                first = mon1; second = mon2; firstSide = 'challenger'; secondSide = 'defender';
            } else {
                first = mon2; second = mon1; firstSide = 'defender'; secondSide = 'challenger';
            }
        }

        // First attacks second
        const hit1 = calculateDamage(first.attack, second.defense);
        second.currentHp = Math.max(0, second.currentHp - hit1.damage);
        turns.push({
            turn: turnCount,
            attacker: { ...first },
            defender: { ...second },
            attackerSide: firstSide,
            damage: hit1.damage,
            critical: hit1.critical,
            defenderHpAfter: second.currentHp,
            defenderMaxHp: second.maxHp,
            fainted: second.currentHp <= 0,
        });

        if (second.currentHp <= 0) {
            if (secondSide === 'challenger') cIdx++;
            else dIdx++;
            continue;
        }

        // Second attacks first
        const hit2 = calculateDamage(second.attack, first.defense);
        first.currentHp = Math.max(0, first.currentHp - hit2.damage);
        turns.push({
            turn: turnCount,
            attacker: { ...second },
            defender: { ...first },
            attackerSide: secondSide,
            damage: hit2.damage,
            critical: hit2.critical,
            defenderHpAfter: first.currentHp,
            defenderMaxHp: first.maxHp,
            fainted: first.currentHp <= 0,
        });

        if (first.currentHp <= 0) {
            if (firstSide === 'challenger') cIdx++;
            else dIdx++;
        }
    }

    const winner = cIdx >= cTeam.length ? 'defender' : 'challenger';
    return { winner, turns, totalTurns: turnCount };
}

/**
 * Calculate soul reward based on opponent team strength.
 * 50-250 souls, scaled by opponent's total stats.
 */
function calculateBattleReward(opponentTeam) {
    const totalStats = opponentTeam.reduce((sum, m) => sum + m.hp + m.attack + m.defense, 0);
    const base = 50 + Math.floor(totalStats / 5);
    return Math.min(base, 200) + Math.floor(Math.random() * 50);
}

module.exports = {
    // Data (re-exports)
    MONSTERS,
    RARITY_ORDER,
    RARITY_CONFIG,
    SPAWN_WEIGHTS,
    CATCH_RATES,
    findMonsterByName,
    HUNT_COOLDOWN,

    // Config
    BLOOD_SHARD_MAX,
    BONE_FRAGMENT_MAX,
    LOOTBOX_DAILY_LIMIT,
    XP_PER_RARITY,

    // Profile
    ensureHuntProfile,
    getHuntProfile,

    // Cooldowns
    checkHuntCooldown,
    setHuntCooldown,

    // Multi-catch
    rollMultiEncounter,
    bulkAddToCollection,

    // Legacy encounters
    rollEncounter,
    rollCatch,

    // Collection
    addToCollection,
    removeFromCollection,
    getCollection,
    getMonsterCount,
    getTotalCount,
    getUniqueCount,
    getDiscoveredMonsters,

    // XP
    calculateHuntXp,
    addHuntXp,
    getXpForLevel,

    // Resources
    rollResourceDrops,
    addResources,

    // Lootbox
    checkLootboxDrop,
    openLootbox,

    // Selling
    rollSellValue,
    sellMonster,
    bulkSellByRarity,
    getTeamMonsterCollectionIds,

    // Items
    HUNT_ITEMS,
    ITEM_RARITY_ORDER,
    ITEM_RARITY_CONFIG,
    rollItemDrop,
    addItemToInventory,
    getUserItems,
    getItemCount,
    getTotalItemCount,
    removeItem,
    rollItemSellValue,
    findItemByName,

    // Formatting
    formatMonsterLine,
    formatRarityLabel,
    formatStats,
    getRandomEscapeMessage,
    formatTimeRemaining,

    // Team
    ensureTeamSlots,
    getTeam,
    setTeamSlot,
    clearTeamSlot,
    equipItem,
    unequipItem,
    getEffectiveStats,

    // Battle
    BATTLE_COOLDOWN,
    checkBattleCooldown,
    recordBattleWin,
    recordBattleLoss,
    simulateBattle,
    calculateDamage,
    calculateBattleReward,
};
