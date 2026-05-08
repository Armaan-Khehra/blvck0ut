const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { ensureUser, addSouls, removeSouls, formatSouls } = require('../../utils/economy');

const MIN_BET = 100;
const MAX_BET = 25000;
const WIN_MULTIPLIER = 1.8; // 1.8x payout (slight house edge)

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription(`${theme.emojis.moon} Flip a cursed coin — heads or tails`)
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription(`Bet amount (${MIN_BET}-${MAX_BET})`).setRequired(true).setMinValue(MIN_BET).setMaxValue(MAX_BET))
        .addStringOption(opt =>
            opt.setName('side').setDescription('Pick heads or tails').setRequired(true)
                .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })),

    async execute(interaction) {
        const bet = interaction.options.getInteger('amount');
        let side = interaction.options.getString('side');
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        if (!bet) {
            return interaction.reply({ embeds: [errorEmbed(`Place a bet between ${MIN_BET} and ${MAX_BET}.`)], ephemeral: true });
        }

        // Normalize side for prefix commands
        if (!side) side = 'heads';
        side = side.toLowerCase();
        if (side !== 'heads' && side !== 'tails') side = 'heads';

        const user = ensureUser(guildId, userId);

        if (user.balance < bet) {
            return interaction.reply({ embeds: [errorEmbed('Your wallet weeps... not enough souls.')], ephemeral: true });
        }

        // Flip
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = result === side;

        const resultGif = result === 'heads' ? theme.gifs.coinflipHeads : theme.gifs.coinflipTails;

        if (won) {
            const winnings = Math.floor(bet * WIN_MULTIPLIER);
            const profit = winnings - bet;
            const newBalance = addSouls(guildId, userId, profit, 'gamble_win', `Coinflip: ${side}`);

            const embed = createEmbed({
                title: `${theme.emojis.fire} Coinflip — ${result.toUpperCase()}`,
                description: `The cursed coin lands on **${result}**!\nYou won ${formatSouls(winnings)} *(+${formatSouls(profit)} profit)*`,
                color: theme.colors.gold,
                image: resultGif,
                fields: [
                    { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance)}`, inline: true },
                ],
            });

            await interaction.reply({ embeds: [embed] });
        } else {
            const newBalance = removeSouls(guildId, userId, bet, 'gamble_loss', `Coinflip: ${side}`);

            const embed = createEmbed({
                title: `${theme.emojis.skull} Coinflip — ${result.toUpperCase()}`,
                description: `The cursed coin lands on **${result}**...\nYou lost ${formatSouls(bet)}`,
                color: theme.colors.danger,
                image: resultGif,
                fields: [
                    { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance ?? 0)}`, inline: true },
                ],
            });

            await interaction.reply({ embeds: [embed] });
        }
    },
};
