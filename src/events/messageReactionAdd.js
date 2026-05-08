const { Events } = require('discord.js');
const theme = require('../utils/theme');
const leveling = require('../utils/leveling');
const logger = require('../utils/logger');

// ─── Reaction XP Config (matching Arcane) ───
const REACTION_XP = 25;
const REACTION_COOLDOWN = 300_000; // 5 minutes

// In-memory cooldown: "reactorId:authorId" → timestamp
// Fine to lose on restart — just a rate limiter
const reactionCooldowns = new Map();

module.exports = {
    name: Events.MessageReactionAdd,
    once: false,
    async execute(reaction, user) {
        try {
            // Ignore bots
            if (user.bot) return;

            // Handle partial reactions (uncached messages)
            if (reaction.partial) {
                try { await reaction.fetch(); } catch { return; }
            }
            if (reaction.message.partial) {
                try { await reaction.message.fetch(); } catch { return; }
            }

            const message = reaction.message;
            if (!message.guild) return;

            // Don't award XP for reacting to your own message
            if (message.author.id === user.id) return;

            // Don't award XP for reacting to bot messages
            if (message.author.bot) return;

            const guildId = message.guild.id;
            const authorId = message.author.id;

            // Check cooldown (per reactor-author pair)
            const cooldownKey = `${user.id}:${authorId}`;
            const lastReaction = reactionCooldowns.get(cooldownKey);
            if (lastReaction && Date.now() - lastReaction < REACTION_COOLDOWN) return;

            reactionCooldowns.set(cooldownKey, Date.now());

            // Award XP to the message author
            const result = leveling.addXp(guildId, authorId, REACTION_XP);

            if (result.leveledUp) {
                const channel = message.client.channels.cache.get(leveling.LEVEL_CHANNEL_ID);
                if (channel) {
                    channel.send(`<a:z:1472059060881719498> <@${authorId}> has reached level **${result.newLevel}**. GG!`).catch(() => {});
                }

                // Assign level reward roles
                const member = message.guild.members.cache.get(authorId)
                    || await message.guild.members.fetch(authorId).catch(() => null);

                if (member) {
                    const rolesToAdd = leveling.getRolesForLevel(guildId, result.newLevel);
                    for (const reward of rolesToAdd) {
                        if (!member.roles.cache.has(reward.role_id)) {
                            member.roles.add(reward.role_id).catch(err => {
                                logger.error(`[Leveling] Failed to add role ${reward.role_id} from reaction: ${err.message}`);
                            });
                        }
                    }
                }
            }
        } catch (err) {
            logger.error(`[Leveling] Reaction XP error: ${err.message}`);
        }
    },
};
