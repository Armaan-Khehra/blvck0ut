const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { getMultiplier, ROLE_MULTIPLIERS, BOOSTER_MULTIPLIER, formatSouls, getCurrencyEmoji } = require('../../utils/economy');

// Friendly names for role tiers
const ROLE_NAMES = {
    damned: '𝔡𝔞𝔪𝔫𝔢𝔡',
    nightshade: '𝔫𝔦𝔤𝔥𝔱𝔰𝔥𝔞𝔡𝔢',
    bloodlust: '𝔟𝔩𝔬𝔬𝔡𝔩𝔲𝔰𝔱',
    venomous: '𝔳𝔢𝔫𝔬𝔪𝔬𝔲𝔰',
    sinful: '𝔰𝔦𝔫𝔣𝔲𝔩',
    blvck_vixen: '𝔟𝔩𝔳𝔠𝔨 𝔳𝔦𝔵𝔢𝔫',
    blvck_thorns: '𝔟𝔩𝔳𝔠𝔨 𝔱𝔥𝔬𝔯𝔫𝔰',
    blvck_phantom: '𝔟𝔩𝔳𝔠𝔨 𝔭𝔥𝔞𝔫𝔱𝔬𝔪',
    blvck_souls: '𝔟𝔩𝔳𝔠𝔨 𝔰𝔬𝔲𝔩𝔰',
    blvck_blood: '𝔟𝔩𝔳𝔠𝔨 𝔟𝔩𝔬𝔬𝔡',
    blvck_eternal: '𝔟𝔩𝔳𝔠𝔨 𝔢𝔱𝔢𝔯𝔫𝔞𝔩',
    blvck_royalty: '𝔟𝔩𝔳𝔠𝔨 𝔯𝔬𝔶𝔞𝔩𝔱𝔶',
    blvck_empire: '𝔟𝔩𝔳𝔠𝔨 𝔢𝔪𝔭𝔦𝔯𝔢',
    blvck_immortal: '𝔟𝔩𝔳𝔠𝔨 𝔦𝔪𝔪𝔬𝔯𝔱𝔞𝔩',
    blvck_nightlord: '𝔟𝔩𝔳𝔠𝔨 𝔫𝔦𝔤𝔥𝔱𝔩𝔬𝔯𝔡',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('multiplier')
        .setDescription(`${theme.emojis.fire} View your soul earning multiplier`)
        .addUserOption(opt => opt.setName('user').setDescription('Check another mortal\'s multiplier')),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const member = interaction.options.getUser('user')
            ? interaction.guild.members.cache.get(target.id) || interaction.member
            : interaction.member;
        const guildId = interaction.guild.id;

        const mult = getMultiplier(guildId, target.id, member);

        const lines = [];

        // Role multiplier
        if (mult.roleName) {
            const friendlyName = ROLE_NAMES[mult.roleName] || mult.roleName;
            lines.push(`${theme.emojis.dagger} **Shop Role:** ${friendlyName} → **${mult.roleMultiplier}x**`);
        } else {
            lines.push(`${theme.emojis.dagger} **Shop Role:** None — *buy a role to earn more!*`);
        }

        // Booster multiplier
        if (mult.isBooster) {
            lines.push(`${theme.emojis.crystal} **Server Booster:** ${theme.emojis.fire} **${BOOSTER_MULTIPLIER}x**`);
        } else {
            lines.push(`${theme.emojis.crystal} **Server Booster:** Not boosting`);
        }

        lines.push('');
        lines.push(theme.divider);
        lines.push('');

        // Total
        lines.push(`${theme.emojis.fire} **Total Multiplier: ${mult.total}x**`);
        if (mult.total > 1) {
            lines.push(`*All soul earnings are multiplied by **${mult.total}x***`);
        }

        // Show all tier multipliers as a reference
        lines.push('');
        lines.push(`**Role Tier Multipliers:**`);
        const entries = Object.entries(ROLE_MULTIPLIERS);
        for (const [id, m] of entries) {
            const name = ROLE_NAMES[id] || id;
            const owned = id === mult.roleName ? ' ◄ *you*' : '';
            lines.push(`╸ ${name} → **${m}x**${owned}`);
        }

        const embed = createEmbed({
            title: `${theme.emojis.fire} ${target.username}'s Multiplier`,
            description: lines.join('\n'),
            color: theme.colors.gold,
            thumbnail: theme.gifs.work,
        });

        await interaction.reply({ embeds: [embed] });
    },
};
