const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { ensureUser, addSouls, formatSouls, checkCooldown, setCooldownFor, formatCooldown, applyMultiplier, getCurrencyEmoji } = require('../../utils/economy');

const DAILY_AMOUNT = 1500;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription(`${theme.emojis.moon} Collect your daily offering of souls`),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        // Check cooldown
        const remaining = checkCooldown(guildId, userId, 'daily', DAILY_COOLDOWN);
        if (remaining > 0) {
            return interaction.reply({
                embeds: [errorEmbed(`The spirits have already blessed you today.\nReturn in **${formatCooldown(remaining)}**.`)],
                ephemeral: true,
            });
        }

        // Grant daily with multiplier
        const { amount: earned, multiplier } = applyMultiplier(guildId, userId, DAILY_AMOUNT, interaction.member);
        const newBalance = addSouls(guildId, userId, earned, 'daily', 'Daily reward');
        setCooldownFor(guildId, userId, 'daily');

        const multLine = multiplier.total > 1
            ? `\n${theme.emojis.bolt} **${multiplier.total}x** multiplier active!`
            : '';

        const embed = createEmbed({
            title: `${theme.emojis.moon} Daily Offering`,
            thumbnail: theme.gifs.daily,
            description: `The spirits grant you ${formatSouls(earned)}${multLine}`,
            color: theme.colors.accent,
            fields: [
                { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance)}`, inline: true },
            ],
        });

        await interaction.reply({ embeds: [embed] });
    },
};
