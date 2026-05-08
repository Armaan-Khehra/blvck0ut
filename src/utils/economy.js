const db = require('../data/database');
const logger = require('./logger');

// ─── Currency Config ───
let CURRENCY_EMOJI = '<a:001_blackheart:1475235856725049585>'; // fallback; resolved dynamically on ready
const CURRENCY_NAME = 'souls';

/**
 * Resolve CURRENCY_EMOJI from the bot's emoji cache by name.
 * Call once on client ready so the ID stays current if the emoji is re-uploaded.
 */
function initCurrencyEmoji(client) {
    const emoji = client.emojis.cache.find(e => e.name === '001_blackheart');
    if (emoji) {
        CURRENCY_EMOJI = emoji.animated
            ? `<a:${emoji.name}:${emoji.id}>`
            : `<:${emoji.name}:${emoji.id}>`;
        logger.info(`[Economy] Resolved CURRENCY_EMOJI → ${CURRENCY_EMOJI}`);
    } else {
        logger.warn('[Economy] 001_blackheart emoji not found in cache, using fallback');
    }
}
const STARTING_BALANCE = 500;
const TRANSFER_TAX = 0.15; // 15%

// ─── Shop Role Multipliers (item_id → multiplier) ───
// Higher shop roles = higher earning multiplier, keeps increasing
const ROLE_MULTIPLIERS = {
    damned:          1.05, // 5% bonus
    nightshade:      1.10, // 10%
    bloodlust:       1.15, // 15%
    venomous:        1.20, // 20%
    sinful:          1.25, // 25%
    blvck_vixen:     1.30, // 30%
    blvck_thorns:    1.35, // 35%
    blvck_phantom:   1.40, // 40%
    blvck_souls:     1.50, // 50%
    blvck_blood:     1.60, // 60%
    blvck_eternal:   1.75, // 75%
    blvck_royalty:   1.90, // 90%
    blvck_empire:    2.00, // 100% (2x)
    blvck_immortal:  2.25, // 125%
    blvck_nightlord: 2.50, // 150% (2.5x)
};

// Server booster bonus (multiplicative with role multiplier)
const BOOSTER_MULTIPLIER = 1.5; // 50% bonus

// ─── Prepared Statements ───
const getUser = db.prepare('SELECT * FROM economy_users WHERE guild_id = ? AND user_id = ?');
const createUser = db.prepare(`
    INSERT OR IGNORE INTO economy_users (guild_id, user_id, balance, bank, total_earned, total_spent)
    VALUES (?, ?, ${STARTING_BALANCE}, 0, 0, 0)
`);
const updateBalance = db.prepare('UPDATE economy_users SET balance = ? WHERE guild_id = ? AND user_id = ?');
const updateEarned = db.prepare('UPDATE economy_users SET total_earned = total_earned + ? WHERE guild_id = ? AND user_id = ?');
const updateSpent = db.prepare('UPDATE economy_users SET total_spent = total_spent + ? WHERE guild_id = ? AND user_id = ?');
const logTransaction = db.prepare(`
    INSERT INTO economy_transactions (guild_id, user_id, type, amount, details)
    VALUES (?, ?, ?, ?, ?)
`);

// Top 10 leaderboard
const getLeaderboard = db.prepare(`
    SELECT user_id, balance, bank, total_earned FROM economy_users
    WHERE guild_id = ? ORDER BY (balance + bank) DESC LIMIT 10
`);

// ─── Cooldown prepared statements (one per action) ───
const cooldownStmts = {};
for (const action of ['daily', 'work', 'crime', 'rob', 'chat_earn', 'rp']) {
    cooldownStmts[action] = db.prepare(`UPDATE economy_users SET last_${action} = ? WHERE guild_id = ? AND user_id = ?`);
}

// ─── Core Functions ───

/**
 * Get or create an economy profile for a user.
 * Auto-creates with starting balance if not found.
 */
function ensureUser(guildId, userId) {
    createUser.run(guildId, userId);
    return getUser.get(guildId, userId);
}

/**
 * Add souls to a user's wallet + log the transaction.
 */
function addSouls(guildId, userId, amount, type = 'earn', details = null) {
    const user = ensureUser(guildId, userId);
    const newBalance = user.balance + amount;
    updateBalance.run(newBalance, guildId, userId);
    updateEarned.run(amount, guildId, userId);
    logTransaction.run(guildId, userId, type, amount, details);
    return newBalance;
}

/**
 * Remove souls from a user's wallet + log the transaction.
 * Returns the new balance, or null if insufficient funds.
 */
function removeSouls(guildId, userId, amount, type = 'spend', details = null) {
    const user = ensureUser(guildId, userId);
    if (user.balance < amount) return null; // Insufficient funds
    const newBalance = user.balance - amount;
    updateBalance.run(newBalance, guildId, userId);
    updateSpent.run(amount, guildId, userId);
    logTransaction.run(guildId, userId, type, -amount, details);
    return newBalance;
}

/**
 * Transfer souls between two users (with tax).
 * Returns { senderBalance, receiverBalance, taxed, received } or null if insufficient.
 */
function transferSouls(guildId, fromId, toId, amount) {
    const sender = ensureUser(guildId, fromId);
    if (sender.balance < amount) return null;

    const taxAmount = Math.floor(amount * TRANSFER_TAX);
    const received = amount - taxAmount;

    const transfer = db.transaction(() => {
        const senderBal = sender.balance - amount;
        updateBalance.run(senderBal, guildId, fromId);
        updateSpent.run(amount, guildId, fromId);
        logTransaction.run(guildId, fromId, 'give_sent', -amount, `To ${toId} (tax: ${taxAmount})`);

        const receiver = ensureUser(guildId, toId);
        const receiverBal = receiver.balance + received;
        updateBalance.run(receiverBal, guildId, toId);
        updateEarned.run(received, guildId, toId);
        logTransaction.run(guildId, toId, 'give_received', received, `From ${fromId}`);

        return { senderBalance: senderBal, receiverBalance: receiverBal, taxed: taxAmount, received };
    });

    return transfer();
}

/**
 * Format a soul amount with the emoji.
 * e.g., formatSouls(5000) → "<:souls:...> 5,000"
 */
function formatSouls(amount) {
    return `${CURRENCY_EMOJI} **${amount.toLocaleString()}**`;
}

/**
 * Check if a cooldown is active.
 * Returns remaining milliseconds or 0 if ready.
 */
function checkCooldown(guildId, userId, action, cooldownMs) {
    const user = ensureUser(guildId, userId);
    const lastUsed = user[`last_${action}`];
    if (!lastUsed) return 0;

    const elapsed = Date.now() - new Date(lastUsed).getTime();
    const remaining = cooldownMs - elapsed;
    return remaining > 0 ? remaining : 0;
}

/**
 * Set a cooldown timestamp to now.
 */
function setCooldownFor(guildId, userId, action) {
    const stmt = cooldownStmts[action];
    if (!stmt) {
        logger.error(`[Economy] Unknown cooldown action: ${action}`);
        return;
    }
    stmt.run(new Date().toISOString(), guildId, userId);
}

/**
 * Format milliseconds into a human-readable countdown.
 * e.g., 125000 → "2m 5s"
 */
function formatCooldown(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
}

// ─── Multiplier System ───

// Get all items a user owns in this guild
const getUserOwnedItems = db.prepare(`
    SELECT DISTINCT item_id FROM economy_inventory WHERE guild_id = ? AND user_id = ?
`);

/**
 * Get the earning multiplier for a user.
 * Combines: highest shop role multiplier × server booster bonus.
 * @param {string} guildId
 * @param {string} userId
 * @param {GuildMember|null} member - Discord guild member (to check booster status)
 * @returns {{ total: number, roleMultiplier: number, roleName: string|null, isBooster: boolean, boosterMultiplier: number }}
 */
function getMultiplier(guildId, userId, member = null) {
    // Find highest owned shop role multiplier
    const ownedItems = getUserOwnedItems.all(guildId, userId);
    let roleMultiplier = 1.0;
    let roleName = null;

    // The order in ROLE_MULTIPLIERS is from lowest to highest
    // Find the highest multiplier the user owns
    for (const item of ownedItems) {
        const mult = ROLE_MULTIPLIERS[item.item_id];
        if (mult && mult > roleMultiplier) {
            roleMultiplier = mult;
            roleName = item.item_id;
        }
    }

    // Check server booster status
    const isBooster = member?.premiumSince ? true : false;
    const boosterMultiplier = isBooster ? BOOSTER_MULTIPLIER : 1.0;

    // Multiplicative: role × booster
    const total = roleMultiplier * boosterMultiplier;

    return {
        total: Math.round(total * 100) / 100, // Round to 2 decimals
        roleMultiplier,
        roleName,
        isBooster,
        boosterMultiplier,
    };
}

/**
 * Apply multiplier to an earning amount.
 * @param {number} baseAmount - The base earning amount
 * @param {string} guildId
 * @param {string} userId
 * @param {GuildMember|null} member
 * @returns {{ amount: number, multiplier: object }}
 */
function applyMultiplier(guildId, userId, baseAmount, member = null) {
    const multiplier = getMultiplier(guildId, userId, member);
    const amount = Math.floor(baseAmount * multiplier.total);
    return { amount, multiplier };
}

module.exports = {
    get CURRENCY_EMOJI() { return CURRENCY_EMOJI; },
    getCurrencyEmoji() { return CURRENCY_EMOJI; },
    initCurrencyEmoji,
    CURRENCY_NAME,
    STARTING_BALANCE,
    TRANSFER_TAX,
    ROLE_MULTIPLIERS,
    BOOSTER_MULTIPLIER,
    ensureUser,
    addSouls,
    removeSouls,
    transferSouls,
    formatSouls,
    checkCooldown,
    setCooldownFor,
    formatCooldown,
    getLeaderboard,
    getMultiplier,
    applyMultiplier,
};
