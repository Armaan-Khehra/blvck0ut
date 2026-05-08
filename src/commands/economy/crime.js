const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { addSouls, removeSouls, formatSouls, checkCooldown, setCooldownFor, formatCooldown, ensureUser, applyMultiplier } = require('../../utils/economy');

const CRIME_WIN_MIN = 1000;
const CRIME_WIN_MAX = 5000;
const CRIME_LOSE_MIN = 500;
const CRIME_LOSE_MAX = 1500;
const CRIME_SUCCESS_RATE = 0.55; // 55% chance of success
const CRIME_COOLDOWN = 10 * 60 * 1000; // 10 minutes

const SUCCESS_SCENARIOS = [
    { crime: 'Tomb Robbery', msg: 'You cracked open an ancient sarcophagus and found treasure' },
    { crime: 'Blood Bank Heist', msg: 'You raided the crimson vault under the cathedral' },
    { crime: 'Relic Smuggling', msg: 'You smuggled cursed artifacts past the night wardens' },
    { crime: 'Soul Trafficking', msg: 'You brokered a deal in the shadow market for trapped spirits' },
    { crime: 'Grave Robbery', msg: 'You dug up a noble\'s burial with jewels intact' },
    { crime: 'Cathedral Theft', msg: 'You slipped past the gargoyles and looted the altar' },
    { crime: 'Poison Trade', msg: 'You sold vials of nightshade to a desperate alchemist' },
    { crime: 'Crypt Plundering', msg: 'You found a hidden chamber filled with ancient coins' },
];

const FAIL_SCENARIOS = [
    { crime: 'Caught Trespassing', msg: 'The graveyard guardians spotted you and confiscated your earnings' },
    { crime: 'Botched Heist', msg: 'You triggered the ward spells and barely escaped alive' },
    { crime: 'Betrayed', msg: 'Your accomplice ratted you out to the shadow council' },
    { crime: 'Cursed', msg: 'You touched a hexed artifact and lost souls as payment' },
    { crime: 'Ambushed', msg: 'Rival thieves cornered you in the catacombs' },
    { crime: 'Failed Ritual', msg: 'The summoning went wrong and drained your essence' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription(`${theme.emojis.dagger} Attempt a heist... if you dare`),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        // Check cooldown
        const remaining = checkCooldown(guildId, userId, 'crime', CRIME_COOLDOWN);
        if (remaining > 0) {
            return interaction.reply({
                embeds: [errorEmbed(`You need to lay low for a while.\nWait **${formatCooldown(remaining)}**.`)],
                ephemeral: true,
            });
        }

        setCooldownFor(guildId, userId, 'crime');

        if (Math.random() < CRIME_SUCCESS_RATE) {
            // Success — apply multiplier to winnings
            const baseEarned = Math.floor(Math.random() * (CRIME_WIN_MAX - CRIME_WIN_MIN + 1)) + CRIME_WIN_MIN;
            const scenario = SUCCESS_SCENARIOS[Math.floor(Math.random() * SUCCESS_SCENARIOS.length)];
            const { amount: earned, multiplier } = applyMultiplier(guildId, userId, baseEarned, interaction.member);
            const newBalance = addSouls(guildId, userId, earned, 'crime', scenario.crime);

            const multLine = multiplier.total > 1
                ? `\n${theme.emojis.bolt} **${multiplier.total}x** multiplier active!`
                : '';

            const embed = createEmbed({
                title: `${theme.emojis.dagger} ${scenario.crime}`,
                thumbnail: theme.gifs.crime,
                description: `${scenario.msg}! **+${formatSouls(earned)}**${multLine}`,
                color: theme.colors.success,
                fields: [
                    { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance)}`, inline: true },
                ],
            });

            await interaction.reply({ embeds: [embed] });
        } else {
            // Fail
            const lost = Math.floor(Math.random() * (CRIME_LOSE_MAX - CRIME_LOSE_MIN + 1)) + CRIME_LOSE_MIN;
            const scenario = FAIL_SCENARIOS[Math.floor(Math.random() * FAIL_SCENARIOS.length)];
            const user = ensureUser(guildId, userId);
            const actualLoss = Math.min(lost, user.balance);
            const newBalance = removeSouls(guildId, userId, actualLoss, 'crime_fail', scenario.crime);

            const embed = createEmbed({
                title: `${theme.emojis.skull} ${scenario.crime}`,
                thumbnail: theme.gifs.crime,
                description: `${scenario.msg}. **-${formatSouls(actualLoss)}**`,
                color: theme.colors.danger,
                fields: [
                    { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance ?? 0)}`, inline: true },
                ],
            });

            await interaction.reply({ embeds: [embed] });
        }
    },
};
