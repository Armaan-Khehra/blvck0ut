const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { ensureUser, addSouls, removeSouls, formatSouls } = require('../../utils/economy');

const MIN_BET = 100;
const MAX_BET = 25000;
const WIN_MULTIPLIER = 2.0; // 2x payout

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription(`${theme.emojis.fire} Roll the bone dice — beat the house`)
        .addIntegerOption(opt =>
            opt.setName('amount').setDescription(`Bet amount (${MIN_BET}-${MAX_BET})`).setRequired(true).setMinValue(MIN_BET).setMaxValue(MAX_BET)),

    async execute(interaction) {
        const bet = interaction.options.getInteger('amount');
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        if (!bet) {
            return interaction.reply({ embeds: [errorEmbed(`Place a bet between ${MIN_BET} and ${MAX_BET}.`)], ephemeral: true });
        }

        const user = ensureUser(guildId, userId);

        if (user.balance < bet) {
            return interaction.reply({ embeds: [errorEmbed('Your wallet weeps... not enough souls.')], ephemeral: true });
        }

        // Both roll 1-12 (two dice)
        const playerRoll = Math.floor(Math.random() * 12) + 1;
        const houseRoll = Math.floor(Math.random() * 12) + 1;

        const diceEmojis = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '1️⃣1️⃣', '1️⃣2️⃣'];

        if (playerRoll > houseRoll) {
            // Win
            const winnings = Math.floor(bet * WIN_MULTIPLIER);
            const profit = winnings - bet;
            const newBalance = addSouls(guildId, userId, profit, 'gamble_win', `Dice: ${playerRoll} vs ${houseRoll}`);

            const embed = createEmbed({
                title: `${theme.emojis.fire} Bone Dice — Victory!`,
                thumbnail: theme.gifs.dice,
                description: [
                    `You rolled **${playerRoll}** vs House **${houseRoll}**`,
                    '',
                    `You claimed ${formatSouls(winnings)} *(+${formatSouls(profit)} profit)*`,
                ].join('\n'),
                color: theme.colors.gold,
                fields: [
                    { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance)}`, inline: true },
                ],
            });

            await interaction.reply({ embeds: [embed] });
        } else if (playerRoll < houseRoll) {
            // Lose
            const newBalance = removeSouls(guildId, userId, bet, 'gamble_loss', `Dice: ${playerRoll} vs ${houseRoll}`);

            const embed = createEmbed({
                title: `${theme.emojis.skull} Bone Dice — Defeat`,
                thumbnail: theme.gifs.dice,
                description: [
                    `You rolled **${playerRoll}** vs House **${houseRoll}**`,
                    '',
                    `The house claims ${formatSouls(bet)}`,
                ].join('\n'),
                color: theme.colors.danger,
                fields: [
                    { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance ?? 0)}`, inline: true },
                ],
            });

            await interaction.reply({ embeds: [embed] });
        } else {
            // Tie — push (no loss no win)
            const embed = createEmbed({
                title: `${theme.emojis.moon} Bone Dice — Draw`,
                thumbnail: theme.gifs.dice,
                description: [
                    `You rolled **${playerRoll}** vs House **${houseRoll}**`,
                    '',
                    `A stalemate... your bet is returned.`,
                ].join('\n'),
                color: theme.colors.vergil,
                fields: [
                    { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(user.balance)}`, inline: true },
                ],
            });

            await interaction.reply({ embeds: [embed] });
        }
    },
};
