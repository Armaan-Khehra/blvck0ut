const db = require('../data/database');
const logger = require('./logger');

// ─── XP Config (matching Arcane defaults) ───
const XP_MIN = 15;
const XP_MAX = 40;
const XP_COOLDOWN = 60_000; // 60 seconds

// ─── Level-up Channel ───
const LEVEL_CHANNEL_ID = '1471632548881895626';

// ─── Prepared Statements ───
const getUser = db.prepare('SELECT * FROM leveling_users WHERE guild_id = ? AND user_id = ?');
const createUser = db.prepare(`
    INSERT OR IGNORE INTO leveling_users (guild_id, user_id, xp, level, total_xp, messages)
    VALUES (?, ?, 0, 0, 0, 0)
`);
const updateXp = db.prepare(`
    UPDATE leveling_users
    SET xp = ?, level = ?, total_xp = ?, messages = messages + 1, last_xp_earn = ?
    WHERE guild_id = ? AND user_id = ?
`);
const setUserLevel = db.prepare(`
    UPDATE leveling_users
    SET xp = ?, level = ?, total_xp = ?
    WHERE guild_id = ? AND user_id = ?
`);
const getLeaderboard = db.prepare(`
    SELECT user_id, level, total_xp, messages FROM leveling_users
    WHERE guild_id = ? ORDER BY total_xp DESC LIMIT 30
`);
const getAllUsers = db.prepare(`
    SELECT user_id, total_xp FROM leveling_users
    WHERE guild_id = ? ORDER BY total_xp DESC
`);
const getLevelRoles = db.prepare(`
    SELECT level, role_id FROM leveling_roles
    WHERE guild_id = ? ORDER BY level ASC
`);
const upsertLevelRole = db.prepare(`
    INSERT INTO leveling_roles (guild_id, level, role_id)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id, level) DO UPDATE SET role_id = excluded.role_id
`);
const deleteLevelRole = db.prepare(`
    DELETE FROM leveling_roles WHERE guild_id = ? AND level = ?
`);

// ─── XP Formula (Linear — matching Arcane) ───

/**
 * XP needed to go from `level` to `level + 1`.
 * Linear curve: level 0→1 = 100, level 1→2 = 200, level 2→3 = 300, etc.
 */
function xpForLevel(level) {
    return 100 * (level + 1);
}

/**
 * Total cumulative XP required to reach a given level.
 * Sum of xpForLevel(0) + xpForLevel(1) + ... + xpForLevel(level - 1)
 * = 100 * (1 + 2 + ... + level) = 50 * level * (level + 1)
 */
function totalXpForLevel(level) {
    return 50 * level * (level + 1);
}

/**
 * Calculate level from total XP (inverse of totalXpForLevel).
 * Solves: 50 * L * (L + 1) <= totalXp
 */
function levelFromTotalXp(totalXp) {
    if (totalXp <= 0) return 0;
    // Quadratic formula: 50L² + 50L - totalXp = 0
    // L = (-50 + sqrt(2500 + 200 * totalXp)) / 100
    const level = Math.floor((-50 + Math.sqrt(2500 + 200 * totalXp)) / 100);
    return Math.max(0, level);
}

// ─── Core Functions ───

/**
 * Get or create a leveling profile for a user.
 */
function ensureUser(guildId, userId) {
    createUser.run(guildId, userId);
    return getUser.get(guildId, userId);
}

/**
 * Add XP to a user. Handles level-up detection.
 * Returns { user, leveledUp, newLevel, oldLevel }
 */
function addXp(guildId, userId, amount) {
    const user = ensureUser(guildId, userId);
    const oldLevel = user.level;
    const newTotalXp = user.total_xp + amount;
    const newLevel = levelFromTotalXp(newTotalXp);

    // Calculate XP within current level
    const xpAtCurrentLevel = newTotalXp - totalXpForLevel(newLevel);

    updateXp.run(
        xpAtCurrentLevel,
        newLevel,
        newTotalXp,
        new Date().toISOString(),
        guildId,
        userId,
    );

    return {
        user: { ...user, xp: xpAtCurrentLevel, level: newLevel, total_xp: newTotalXp },
        leveledUp: newLevel > oldLevel,
        newLevel,
        oldLevel,
    };
}

/**
 * Set a user to a specific level (for migration/admin).
 */
function setLevel(guildId, userId, level) {
    const user = ensureUser(guildId, userId);
    const totalXp = totalXpForLevel(level);
    setUserLevel.run(0, level, totalXp, guildId, userId);
    return { ...user, xp: 0, level, total_xp: totalXp };
}

/**
 * Get progress info for a user's current level.
 */
function getLevelProgress(user) {
    const needed = xpForLevel(user.level); // XP needed for next level
    const current = user.xp; // XP earned in current level
    const percentage = Math.min(100, Math.floor((current / needed) * 100));
    return { currentXp: current, neededXp: needed, percentage };
}

/**
 * Build a visual progress bar.
 */
function progressBar(percentage, length = 10) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '`[' + '█'.repeat(filled) + '░'.repeat(empty) + ']`';
}

/**
 * Check XP cooldown. Returns remaining ms or 0.
 */
function checkXpCooldown(guildId, userId) {
    const user = ensureUser(guildId, userId);
    if (!user.last_xp_earn) return 0;
    const elapsed = Date.now() - new Date(user.last_xp_earn).getTime();
    const remaining = XP_COOLDOWN - elapsed;
    return remaining > 0 ? remaining : 0;
}

/**
 * Get all reward roles for a guild, sorted by level ascending.
 */
function getRewardRoles(guildId) {
    return getLevelRoles.all(guildId);
}

/**
 * Get roles that should be assigned for a given level (all roles at or below that level).
 */
function getRolesForLevel(guildId, level) {
    const allRoles = getRewardRoles(guildId);
    return allRoles.filter(r => r.level <= level);
}

module.exports = {
    XP_MIN,
    XP_MAX,
    XP_COOLDOWN,
    LEVEL_CHANNEL_ID,
    ensureUser,
    addXp,
    setLevel,
    xpForLevel,
    totalXpForLevel,
    levelFromTotalXp,
    getLevelProgress,
    progressBar,
    checkXpCooldown,
    getRewardRoles,
    getRolesForLevel,
    getLeaderboard,
    getAllUsers,
    upsertLevelRole,
    deleteLevelRole,
};
