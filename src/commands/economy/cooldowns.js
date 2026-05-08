const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { ensureUser, formatCooldown } = require('../../utils/economy');

// Cooldown definitions in milliseconds
const COOLDOWNS = {
    daily:  { label: 'Daily',    field: 'last_daily',  ms: 24 * 60 * 60 * 1000, emoji: theme.emojis.moon },
    work:   { label: 'Work',     field: 'last_work',   ms: 5 * 60 * 1000,       emoji: theme.emojis.chain },
    crime:  { label: 'Crime',    field: 'last_crime',  ms: 10 * 60 * 1000,      emoji: theme.emojis.dagger },
    rob:    { label: 'Rob',      field: 'last_rob',    ms: 15 * 60 * 1000,      emoji: theme.emojis.skull },
    rp:     { label: 'Roleplay', field: 'last_rp',     ms: 3 * 60 * 1000,       emoji: theme.emojis.crystal },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cooldowns')
        .setDescription(`${theme.emojis.candle} Check your active cooldowns`),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const user = ensureUser(guildId, userId);

        const lines = [];

        for (const [key, cd] of Object.entries(COOLDOWNS)) {
            const lastUsed = user[cd.field];
            if (!lastUsed) {
                lines.push(`${cd.emoji} **${cd.label}:** ${theme.emojis.rose} Ready`);
                continue;
            }

            const elapsed = Date.now() - new Date(lastUsed).getTime();
            const remaining = cd.ms - elapsed;

            if (remaining <= 0) {
                lines.push(`${cd.emoji} **${cd.label}:** ${theme.emojis.rose} Ready`);
            } else {
                lines.push(`${cd.emoji} **${cd.label}:** ${theme.emojis.fire} ${formatCooldown(remaining)}`);
            }
        }

        const embed = createEmbed({
            title: `${theme.emojis.candle} Cooldowns`,
            thumbnail: theme.gifs.cooldowns,
            description: [
                `*${interaction.user.username}'s timers*`,
                theme.divider,
                '',
                ...lines,
            ].join('\n'),
            color: theme.colors.primary,
        });

        await interaction.reply({ embeds: [embed] });
    },
};
