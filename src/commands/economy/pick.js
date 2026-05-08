const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier, getCurrencyEmoji } = require('../../utils/economy');
const logger = require('../../utils/logger');

// In-memory soul drop tracking (channelId → { amount, timestamp, messageId })
const soulDrops = new Map();
const DROP_EXPIRY = 30 * 1000; // 30 seconds

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pick')
        .setDescription(`${theme.emojis.crystal} Pick up a wandering soul`),

    async execute(interaction) {
        const channelId = interaction.channel.id;
        const drop = soulDrops.get(channelId);

        if (!drop) {
            return interaction.reply({
                embeds: [errorEmbed('There are no lost souls here... the void is silent.')],
                ephemeral: true,
            });
        }

        // Check if expired
        if (Date.now() - drop.timestamp > DROP_EXPIRY) {
            soulDrops.delete(channelId);
            return interaction.reply({
                embeds: [errorEmbed('The soul faded back into the void... too slow.')],
                ephemeral: true,
            });
        }

        // Claim it — apply multiplier to the picker
        soulDrops.delete(channelId);

        let earned, multiplier, newBalance;
        try {
            ({ amount: earned, multiplier } = applyMultiplier(interaction.guild.id, interaction.user.id, drop.amount, interaction.member));
            newBalance = addSouls(interaction.guild.id, interaction.user.id, earned, 'pick', 'Soul drop');
        } catch (err) {
            logger.error(`[Pick] Economy error for ${interaction.user.id}:`, err);
            return interaction.reply({
                embeds: [errorEmbed('The spirits rejected the offering... try again later.')],
                ephemeral: true,
            });
        }

        const multLine = multiplier.total > 1
            ? `\n${theme.emojis.bolt} **${multiplier.total}x** multiplier active!`
            : '';

        const embed = createEmbed({
            title: `${getCurrencyEmoji()} Soul Claimed`,
            thumbnail: theme.gifs.pick,
            description: `**${interaction.user.username}** claimed ${formatSouls(earned)}${multLine}`,
            color: theme.colors.accent,
            fields: [
                { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance)}`, inline: true },
            ],
        });

        await interaction.reply({ embeds: [embed] });

        // Try to delete the drop message
        if (drop.messageId) {
            try {
                const msg = await interaction.channel.messages.fetch(drop.messageId);
                if (msg) await msg.delete();
            } catch {}
        }
    },

    // Exported for messageCreate.js to use
    soulDrops,
    DROP_EXPIRY,
};
