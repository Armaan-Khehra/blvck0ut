const { Events, EmbedBuilder } = require('discord.js');
const db = require('../data/database');
const logger = require('../utils/logger');
const { sendLog } = require('../utils/channelLog');
const theme = require('../utils/theme');
const { addRecentJoin } = require('../utils/recentJoins');

const WELCOME_GIF = 'https://image2url.com/r2/default/gifs/1771202959733-2b3af6ec-89d6-4949-971b-dc4b674f1a80.gif';

// Anti-abuse: track when users last triggered a welcome ping
// Map<"guildId-userId", timestamp>
const recentWelcomePings = new Map();
const REJOIN_COOLDOWN = 30 * 60 * 1000; // 30 minutes

const getConfig = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member) {
        logger.info(`[Welcome] Member joined: ${member.user.tag} in ${member.guild.name}`);

        // Track this join so we can reward people who welcome them
        addRecentJoin(member.guild.id, member.user.id);
        logger.info(`[WelcomeReward] Tracking join for ${member.user.tag} (${member.user.id})`);

        const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
        sendLog(member.client, {
            title: `${theme.emojis.rose} Member Joined`,
            description: `**${member.user.tag}** has entered the realm.`,
            color: theme.colors.accent,
            fields: [
                { name: `${theme.emojis.skull} User`, value: `${member.user} (${member.user.tag})`, inline: true },
                { name: `${theme.emojis.moon} Account Age`, value: `${accountAge} day(s)`, inline: true },
                { name: `${theme.emojis.bat} Member Count`, value: `${member.guild.memberCount}`, inline: true },
            ],
            thumbnail: member.user.displayAvatarURL({ size: 256 }),
        });

        const config = getConfig.get(member.guild.id);

        // Auto-role (only if configured via /setautorole)
        if (config && config.autorole_id) {
            const role = member.guild.roles.cache.get(config.autorole_id);
            if (role) {
                await member.roles.add(role).catch(err =>
                    logger.error(`Failed to add autorole: ${err.message}`)
                );
            }
        }

        // Welcome ping + message in general chat (with rejoin cooldown)
        const cooldownKey = `${member.guild.id}-${member.user.id}`;
        const lastPing = recentWelcomePings.get(cooldownKey);
        const now = Date.now();

        if (lastPing && now - lastPing < REJOIN_COOLDOWN) {
            logger.info(`[Welcome] Skipping welcome ping for ${member.user.tag} — rejoin cooldown (${Math.round((REJOIN_COOLDOWN - (now - lastPing)) / 1000)}s remaining)`);
        } else {
            const pingChannelId = process.env.WELCOME_PING_CHANNEL_ID;
            const pingChannel = pingChannelId
                ? member.guild.channels.cache.get(pingChannelId) || await member.guild.channels.fetch(pingChannelId).catch(() => null)
                : null;

            if (pingChannel) {
                recentWelcomePings.set(cooldownKey, now);
                setTimeout(() => recentWelcomePings.delete(cooldownKey), REJOIN_COOLDOWN);

                const welcomePingRoleId = process.env.WELCOME_PING_ROLE_ID;
                const rolePing = welcomePingRoleId ? `<@&${welcomePingRoleId}>` : '';
                const content = `${rolePing}\n\u2726 **Welc0me** ${member}`;
                const embed = new EmbedBuilder()
                    .setColor(0xFFFFFF)
                    .setDescription(`\u207A \u2040\u2022\u2661 \u0DC4\u0D9E \u25CB blvck0ut \u0B6E`)
                    .setThumbnail(WELCOME_GIF);
                pingChannel.send({ content, embeds: [embed] }).catch(err =>
                    logger.error(`Failed to send welcome message: ${err.message}`)
                );
            }
        }
    },
};
