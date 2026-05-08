const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { ensureUser, formatSouls, getCurrencyEmoji } = require('../../utils/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription(`${theme.emojis.skull} Check your soul balance`)
        .addUserOption(opt => opt.setName('user').setDescription('Check another mortal\'s balance')),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const user = ensureUser(interaction.guild.id, target.id);

        const wallet = user.balance;
        const bank = user.bank;
        const net = wallet + bank;

        const embed = createEmbed({
            title: `${getCurrencyEmoji()} Soul Ledger`,
            description: `**${target.username}**'s treasury`,
            color: theme.colors.accent,
            fields: [
                { name: `${theme.emojis.dagger} Wallet`, value: formatSouls(wallet), inline: true },
                { name: `${theme.emojis.coffin} Bank`, value: formatSouls(bank), inline: true },
                { name: `${theme.emojis.diamond} Net Worth`, value: formatSouls(net), inline: true },
                { name: `${theme.emojis.fire} Lifetime`, value: `Earned: ${formatSouls(user.total_earned)}\nSpent: ${formatSouls(user.total_spent)}`, inline: false },
            ],
            thumbnail: theme.gifs.balance,
        });

        await interaction.reply({ embeds: [embed] });
    },
};
