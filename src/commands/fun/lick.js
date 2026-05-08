const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 30;
const REWARD_MAX = 70;

const GIFS = [
    'https://media.tenor.com/hX6bh9AbOjAAAAAC/black-butler-lick.gif',
    'https://media.tenor.com/C44-xtekuYIAAAAC/sebastian-michaelis-anime.gif',
    'https://media.tenor.com/75VnAwZc12wAAAAC/black-butler-sebastian.gif',
    'https://media.tenor.com/jzI99yLEK8IAAAAC/shurppp.gif',
    'https://media.tenor.com/b-ArPv_olhEAAAAC/kurama-yu-yu-hakusho.gif',
    'https://media.tenor.com/Omih4c2xXjwAAAAC/qiao-ling-link-click.gif',
];

const RESPONSES = [
    '{user} licked {target}\'s face\n*salty... with a hint of fear*',
    '{user} ran their tongue across {target}\'s cheek\n*claiming what\'s theirs*',
    '{user} licked {target} like a vampire tasting blood\n*interesting flavor*',
    '{user} gave {target} a long, slow lick\n*the audacity is unmatched*',
    '{user} licked {target} and grinned\n*you belong to me now*',
    '{user} tasted {target}\'s neck\n*not quite ready to bite... yet*',
    '{user} dragged their tongue across {target}\n*marking their territory*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lick')
        .setDescription(`${theme.emojis.chain} Lick someone... because why not`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to lick').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (!target) {
            return interaction.reply({ content: 'mention someone to lick. `-lick @user`', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'you licked your own hand... *weirdo*', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'lick', `Licked ${target.username}`);

        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)]
            .replace('{user}', `**${interaction.member.displayName}**`)
            .replace('{target}', `${target}`);
        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setDescription(`${theme.emojis.chain} ${response}\n\n+${formatSouls(reward)}`)
            .setImage(gif)
            .setColor(0x2b2d31);
        await interaction.reply({ embeds: [embed] });
    },
};
