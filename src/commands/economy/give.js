const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { transferSouls, formatSouls, TRANSFER_TAX, getCurrencyEmoji } = require('../../utils/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription(`${theme.emojis.rose} Transfer souls to another mortal`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to give souls to').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('How many souls to transfer').setRequired(true).setMinValue(1)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        if (!target || !amount) {
            return interaction.reply({ embeds: [errorEmbed('Specify a user and amount.')], ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ embeds: [errorEmbed('You cannot transfer souls to yourself, narcissist.')], ephemeral: true });
        }

        if (target.bot) {
            return interaction.reply({ embeds: [errorEmbed('Bots have no use for souls.')], ephemeral: true });
        }

        const result = transferSouls(interaction.guild.id, interaction.user.id, target.id, amount);

        if (!result) {
            return interaction.reply({ embeds: [errorEmbed('Your wallet doesn\'t hold that many souls.')], ephemeral: true });
        }

        const taxPercent = Math.round(TRANSFER_TAX * 100);

        const embed = createEmbed({
            title: `${theme.emojis.rose} Soul Transfer`,
            thumbnail: theme.gifs.give,
            description: `**${interaction.user.username}** sent ${formatSouls(amount)} to **${target.username}**`,
            color: theme.colors.accent,
            fields: [
                { name: `${theme.emojis.fire} Tax (${taxPercent}%)`, value: `${formatSouls(result.taxed)}`, inline: true },
                { name: `${theme.emojis.crystal} Received`, value: `${formatSouls(result.received)}`, inline: true },
                { name: `${theme.emojis.diamond} Your Wallet`, value: `${formatSouls(result.senderBalance)}`, inline: true },
            ],
        });

        await interaction.reply({ embeds: [embed] });
    },
};
