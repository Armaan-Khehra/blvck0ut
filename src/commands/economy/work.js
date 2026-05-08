const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, checkCooldown, setCooldownFor, formatCooldown, applyMultiplier, getCurrencyEmoji } = require('../../utils/economy');

const WORK_MIN = 500;
const WORK_MAX = 2000;
const WORK_COOLDOWN = 5 * 60 * 1000; // 5 minutes

const WORK_SCENARIOS = [
    { job: 'Gravedigger', msg: 'You unearthed coffins in the moonlit cemetery' },
    { job: 'Blood Courier', msg: 'You delivered vials of crimson essence across the city' },
    { job: 'Crypt Keeper', msg: 'You swept the cobwebs from the ancient catacombs' },
    { job: 'Nightwatch', msg: 'You patrolled the cursed grounds until dawn' },
    { job: 'Bone Collector', msg: 'You gathered skeletal remains from the forgotten battlefield' },
    { job: 'Hex Scribe', msg: 'You transcribed forbidden incantations by candlelight' },
    { job: 'Potion Brewer', msg: 'You stirred the cauldron through the witching hour' },
    { job: 'Soul Ferryman', msg: 'You guided lost spirits across the river of the dead' },
    { job: 'Tombstone Carver', msg: 'You etched names into cold, grey stone' },
    { job: 'Shadow Weaver', msg: 'You stitched darkness into enchanted garments' },
    { job: 'Plague Doctor', msg: 'You tended to the cursed and afflicted' },
    { job: 'Raven Keeper', msg: 'You fed and trained the unkindness of ravens' },
    { job: 'Coffin Carpenter', msg: 'You crafted eternal resting places from blackwood' },
    { job: 'Bat Handler', msg: 'You wrangled the colony in the bell tower' },
    { job: 'Dungeon Janitor', msg: 'You mopped the blood from the torture chamber floors' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription(`${theme.emojis.chain} Work a dark trade for souls`),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        // Check cooldown
        const remaining = checkCooldown(guildId, userId, 'work', WORK_COOLDOWN);
        if (remaining > 0) {
            return interaction.reply({
                embeds: [errorEmbed(`You're still recovering from your last shift.\nRest for **${formatCooldown(remaining)}**.`)],
                ephemeral: true,
            });
        }

        // Random base earnings and scenario
        const baseEarned = Math.floor(Math.random() * (WORK_MAX - WORK_MIN + 1)) + WORK_MIN;
        const scenario = WORK_SCENARIOS[Math.floor(Math.random() * WORK_SCENARIOS.length)];

        // Apply multiplier (shop role + booster)
        const { amount: earned, multiplier } = applyMultiplier(guildId, userId, baseEarned, interaction.member);

        const newBalance = addSouls(guildId, userId, earned, 'work', scenario.job);
        setCooldownFor(guildId, userId, 'work');

        // Build multiplier line
        const multLine = multiplier.total > 1
            ? `\n${theme.emojis.bolt} **${multiplier.total}x** multiplier active!`
            : '';

        const embed = createEmbed({
            title: `${theme.emojis.chain} ${scenario.job}`,
            thumbnail: theme.gifs.work,
            description: `${scenario.msg} and earned ${formatSouls(earned)}${multLine}`,
            color: theme.colors.accent,
            fields: [
                { name: `${theme.emojis.diamond} Wallet`, value: `${formatSouls(newBalance)}`, inline: true },
            ],
        });

        await interaction.reply({ embeds: [embed] });
    },
};
