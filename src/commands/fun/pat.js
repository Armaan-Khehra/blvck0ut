const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 20;
const REWARD_MAX = 60;

const GIFS = [
    'https://media.tenor.com/Zcz-jb2w5cEAAAAC/anime-head-pat-goth-anime-headpat.gif',
    'https://media.tenor.com/z-zo3LRqx0QAAAAC/head-pat-its-okay.gif',
    'https://media.tenor.com/jpx4HDUyBLoAAAAC/anime-pat.gif',
    'https://media.tenor.com/LagOnw2z4mwAAAAC/headpats-neko.gif',
    'https://media.tenor.com/NGtsfrbu0K0AAAAC/headpat-anime.gif',
    'https://media.tenor.com/Ls2uiad4RRUAAAAC/anime-anime-headpat.gif',
];

const RESPONSES = [
    '{user} patted {target} on the head\n*good little creature of the night*',
    '{user} gave {target} gentle headpats\n*even demons deserve affection*',
    '{user} softly patted {target}\n*there there... the darkness isn\'t so bad*',
    '{user} ruffled {target}\'s hair\n*who\'s a good ghoul?*',
    '{user} patted {target} with a cold hand\n*comforting... in a cursed kind of way*',
    '{user} blessed {target} with headpats\n*the highest honor in the underworld*',
    '{user} gently patted {target}\'s head\n*you\'ve earned this*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pat')
        .setDescription(`${theme.emojis.crystal} Give someone headpats`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to pat').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (!target) {
            return interaction.reply({ content: 'mention someone to pat. `-pat @user`', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: '*you pat your own head... it helps a little*', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'pat', `Patted ${target.username}`);

        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)]
            .replace('{user}', `**${interaction.member.displayName}**`)
            .replace('{target}', `${target}`);
        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setDescription(`${theme.emojis.crystal} ${response}\n\n+${formatSouls(reward)}`)
            .setImage(gif)
            .setColor(0x2b2d31);
        await interaction.reply({ embeds: [embed] });
    },
};
