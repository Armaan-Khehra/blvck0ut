const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 60;
const REWARD_MAX = 150;

const GIFS = [
    'https://media.tenor.com/96ZZv5k4FnwAAAAC/bdj-jska.gif',
    'https://media.tenor.com/5nma1uQBooYAAAAC/anime-dark.gif',
    'https://media.tenor.com/_wmzDrSE3l0AAAAC/dark-japan.gif',
    'https://media.tenor.com/AmE19LJy5ZQAAAAC/anime-dark.gif',
    'https://media.tenor.com/836j3wHzynEAAAAC/dark-anime.gif',
    'https://media.tenor.com/sANj-8kvWkkAAAAC/anime.gif',
];

const RESPONSES = [
    '{user} took {target} to the shadow realm\n*what happens in the void stays in the void*',
    '{user} and {target} disappeared behind the cathedral doors\n*the candles flickered violently*',
    '{user} dragged {target} into the darkness\n*unholy sounds echoed through the crypt*',
    '{user} pinned {target} against the cold stone wall\n*the spirits looked away*',
    '{user} and {target} committed sins in the moonlight\n*even the demons blushed*',
    '{user} and {target} vanished into the abyss together\n*we don\'t talk about what happened next*',
    '{user} defiled {target} in the graveyard\n*the tombstones are the only witnesses*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fuck')
        .setDescription(`${theme.emojis.fire} Commit unholy acts with someone`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to defile').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (!target) {
            return interaction.reply({ content: 'mention someone. `-fuck @user`', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: '...down bad', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'fuck', `Defiled ${target.username}`);

        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)]
            .replace('{user}', `**${interaction.member.displayName}**`)
            .replace('{target}', `${target}`);
        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setDescription(`${theme.emojis.fire} ${response}\n\n+${formatSouls(reward)}`)
            .setImage(gif)
            .setColor(0x2b2d31);
        await interaction.reply({ embeds: [embed] });
    },
};
