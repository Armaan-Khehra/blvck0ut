const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { ensureUser, addSouls, removeSouls, formatSouls } = require('../../utils/economy');

const MIN_BET = 100;
const MAX_BET = 25000;

// Slot symbols with weights and multipliers
const SYMBOLS = [
    { emoji: '💀', name: 'skull',   weight: 25 },
    { emoji: '🦇', name: 'bat',     weight: 22 },
    { emoji: '🌹', name: 'rose',    weight: 20 },
    { emoji: '🗡️', name: 'dagger', weight: 15 },
    { emoji: '🔮', name: 'crystal', weight: 10 },
    { emoji: '👑', name: 'crown',   weight: 5 },
    { emoji: '🩸', name: 'blood',   weight: 3 },
];

// Payouts for matching (3 of a kind)
const PAYOUTS = {
    skull:   2.0,   // common
    bat:     2.5,
    rose:    3.0,
    dagger:  4.0,
    crystal: 6.0,
    crown:   10.0,  // rare
    blood:   15.0,  // ultra rare — jackpot
};

// 2 of a kind pays 0.5x the 3-of-a-kind multiplier
const TWO_OF_A_KIND_FACTOR = 0.3;

function spin() {
    const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
    const roll = () => {
        let r = Math.random() * totalWeight;
        for (const s of SYMBOLS) {
            r -= s.weight;
            if (r <= 0) return s;
        }
        return SYMBOLS[0];
    };
    return [roll(), roll(), roll()];
}

function calculateWin(reels, bet) {
    const names = reels.map(r => r.name);

    // 3 of a kind
    if (names[0] === names[1] && names[1] === names[2]) {
        const multiplier = PAYOUTS[names[0]] || 2.0;
        return { multiplier, type: 'jackpot' };
    }

    // 2 of a kind
    if (names[0] === names[1] || names[1] === names[2] || names[0] === names[2]) {
        const matchName = names[0] === names[1] ? names[0] : (names[1] === names[2] ? names[1] : names[0]);
        const multiplier = (PAYOUTS[matchName] || 2.0) * TWO_OF_A_KIND_FACTOR;
        return { multiplier, type: 'partial' };
    }

    return { multiplier: 0, type: 'loss' };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription(`${theme.emojis.crystal} Pull the lever on the cursed machine`)
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

        const reels = spin();
        const result = calculateWin(reels, bet);
        const reelDisplay = reels.map(r => r.emoji).join(' │ ');

        if (result.type === 'jackpot') {
            const winnings = Math.floor(bet * result.multiplier);
            const profit = winnings - bet;
            const newBalance = addSouls(guildId, userId, profit, 'gamble_win', `Slots: ${result.multiplier}x`);

            const embed = createEmbed({
                title: `${theme.emojis.crystal} SLOTS — JACKPOT!`,
                thumbnail: theme.gifs.slots,
                description: [
                    `\`[ ${reelDisplay} ]\``,
                    '',
                    `**${result.multiplier}x** — You won ${formatSouls(winnings)}!`,
                ].join('\n'),
                color: theme.colors.gold,
                fields: [
                    { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance)}`, inline: true },
                ],
            });

            await interaction.reply({ embeds: [embed] });
        } else if (result.type === 'partial') {
            const winnings = Math.floor(bet * result.multiplier);
            if (winnings >= bet) {
                const profit = winnings - bet;
                const newBalance = addSouls(guildId, userId, profit, 'gamble_win', `Slots: ${result.multiplier.toFixed(1)}x`);
                const embed = createEmbed({
                    title: `${theme.emojis.crystal} SLOTS — Partial Match`,
                    thumbnail: theme.gifs.slots,
                    description: [
                        `\`[ ${reelDisplay} ]\``,
                        '',
                        `**${result.multiplier.toFixed(1)}x** — You won ${formatSouls(winnings)}`,
                    ].join('\n'),
                    color: theme.colors.success,
                    fields: [
                        { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance)}`, inline: true },
                    ],
                });
                await interaction.reply({ embeds: [embed] });
            } else {
                const loss = bet - winnings;
                const newBalance = removeSouls(guildId, userId, loss, 'gamble_loss', `Slots: partial ${result.multiplier.toFixed(1)}x`);
                const embed = createEmbed({
                    title: `${theme.emojis.crystal} SLOTS — Partial Match`,
                    thumbnail: theme.gifs.slots,
                    description: [
                        `\`[ ${reelDisplay} ]\``,
                        '',
                        `**${result.multiplier.toFixed(1)}x** — You got back ${formatSouls(winnings)} *(lost ${formatSouls(loss)})*`,
                    ].join('\n'),
                    color: theme.colors.accent,
                    fields: [
                        { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance ?? 0)}`, inline: true },
                    ],
                });
                await interaction.reply({ embeds: [embed] });
            }
        } else {
            // Total loss
            const newBalance = removeSouls(guildId, userId, bet, 'gamble_loss', 'Slots: loss');

            const embed = createEmbed({
                title: `${theme.emojis.skull} SLOTS — Nothing`,
                thumbnail: theme.gifs.slots,
                description: [
                    `\`[ ${reelDisplay} ]\``,
                    '',
                    `The machine devours ${formatSouls(bet)}`,
                ].join('\n'),
                color: theme.colors.danger,
                fields: [
                    { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance ?? 0)}`, inline: true },
                ],
            });

            await interaction.reply({ embeds: [embed] });
        }
    },
};
