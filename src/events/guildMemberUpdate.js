const { Events } = require('discord.js');
const config = require('../../config');
const logger = require('../utils/logger');
const db = require('../data/database');

// ─── Supporter Role: Auto-assign when members wear the server clan tag ───
const SUPPORTER_ROLE_ID = '1490479306143563847';

// Check if a member is wearing this server's clan tag
function hasServerTag(member) {
    const pg = member.user.primaryGuild;
    return pg?.identityGuildId === member.guild.id && pg?.identityEnabled !== false;
}

// Add or remove the supporter role based on whether the member has the tag
async function syncSupporterRole(member) {
    if (!member || member.user.bot) return;

    // Always force-fetch — primaryGuild is never in the gateway cache
    try {
        await member.user.fetch(true);
    } catch { return; }

    const hasTag = hasServerTag(member);
    const hasRole = member.roles.cache.has(SUPPORTER_ROLE_ID);

    if (hasTag && !hasRole) {
        try {
            await member.roles.add(SUPPORTER_ROLE_ID, 'Server clan tag detected — auto supporter role');
            logger.info(`[Supporter] Added supporter role to ${member.user.tag} (wearing clan tag)`);
        } catch (err) {
            logger.error(`[Supporter] Failed to add role to ${member.user.tag}: ${err.message}`);
        }
    } else if (!hasTag && hasRole) {
        try {
            await member.roles.remove(SUPPORTER_ROLE_ID, 'Server clan tag removed — supporter role revoked');
            logger.info(`[Supporter] Removed supporter role from ${member.user.tag} (clan tag gone)`);
        } catch (err) {
            logger.error(`[Supporter] Failed to remove role from ${member.user.tag}: ${err.message}`);
        }
    }
}

module.exports = {
    name: Events.GuildMemberUpdate,
    once: false,
    async execute(oldMember, newMember) {
        // Only run in the main server
        if (newMember.guild.id !== config.guildId) return;

        await syncSupporterRole(newMember);

        // ─── Boost color cleanup: remove custom color role if they unboost ───
        if (oldMember.premiumSince && !newMember.premiumSince) {
            try {
                const row = db.prepare('SELECT role_id FROM boost_colors WHERE guild_id = ? AND user_id = ?')
                    .get(newMember.guild.id, newMember.id);
                if (row) {
                    const role = newMember.guild.roles.cache.get(row.role_id);
                    if (role) await role.delete('Boost ended — custom color removed').catch(() => {});
                    db.prepare('DELETE FROM boost_colors WHERE guild_id = ? AND user_id = ?')
                        .run(newMember.guild.id, newMember.id);
                    logger.info(`[BoostColor] Removed custom color for ${newMember.user.tag} (unboost)`);
                }
            } catch (err) {
                logger.error(`[BoostColor] Cleanup failed for ${newMember.user.tag}: ${err.message}`);
            }
        }
    },

    // Export for use in ready.js (full guild scan) and messageCreate.js (passive sync)
    syncSupporterRole,
    hasServerTag,
    SUPPORTER_ROLE_ID,
};
