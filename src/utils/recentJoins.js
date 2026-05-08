// Tracks recently joined members so we can reward people who welcome them
// Map<guildId-userId, { userId, joinedAt, welcomedBy: Set<userId> }>
const recentJoins = new Map();

// How long after joining a "welcome" message counts (10 minutes)
const JOIN_WINDOW = 10 * 60 * 1000;

/**
 * Record that a member just joined.
 */
function addRecentJoin(guildId, userId) {
    const key = `${guildId}-${userId}`;
    recentJoins.set(key, {
        userId,
        joinedAt: Date.now(),
        welcomedBy: new Set(),
    });

    // Auto-cleanup after the window expires
    setTimeout(() => recentJoins.delete(key), JOIN_WINDOW + 1000);
}

/**
 * Check if there are any recent joins that haven't been welcomed by this user yet.
 * Returns the first un-welcomed recent joiner, or null.
 */
function getUnwelcomedJoin(guildId, welcomerId) {
    const now = Date.now();
    for (const [key, data] of recentJoins) {
        if (!key.startsWith(`${guildId}-`)) continue;
        if (data.userId === welcomerId) continue; // Can't welcome yourself
        if (now - data.joinedAt > JOIN_WINDOW) continue; // Expired
        if (data.welcomedBy.has(welcomerId)) continue; // Already welcomed by this user
        return data;
    }
    return null;
}

/**
 * Mark that a user has welcomed a recent joiner.
 */
function markWelcomed(guildId, joinerId, welcomerId) {
    const key = `${guildId}-${joinerId}`;
    const data = recentJoins.get(key);
    if (data) {
        data.welcomedBy.add(welcomerId);
    }
}

module.exports = {
    recentJoins,
    addRecentJoin,
    getUnwelcomedJoin,
    markWelcomed,
    JOIN_WINDOW,
};
