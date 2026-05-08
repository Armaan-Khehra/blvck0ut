const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 30;
const REWARD_MAX = 80;

const GIFS = [
    'https://media.tenor.com/hgLJ9nVB-HEAAAAC/darker-than-black-dtb-yin.gif',
    'https://media.tenor.com/t3rv2aFIbPIAAAAC/darker-than-black-dtb-hei.gif',
    'https://media.tenor.com/p-z4h8Tkiz0AAAAC/vampire-animegirl.gif',
    'https://media.tenor.com/vontOjN9km4AAAAC/horimiya-anime-horimiya.gif',
    'https://media.tenor.com/8lV7iQZIzNwAAAAC/anime-hug.gif',
    'https://media.tenor.com/m-4usUSchi8AAAAC/happy-goth-goth-anime-girl.gif',
];

const RESPONSES = [
    '{user} curled up next to {target} in the dark\n*two heartbeats in a sea of silence*',
    '{user} pulled {target} under the velvet blanket\n*the night is cold... but not anymore*',
    '{user} cuddled {target} by the dying fire\n*embers and whispers*',
    '{user} nestled into {target}\'s arms\n*the coffin was big enough for two*',
    '{user} snuggled up to {target} in the moonlight\n*even creatures of the night need comfort*',
    '{user} held {target} close until the stars faded\n*dawn can wait*',
    '{user} and {target} tangled together in the shadows\n*warmth in the void*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cuddle')
        .setDescription(`${theme.emojis.moon} Cuddle with someone in the dark`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to cuddle').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (!target) {
            return interaction.reply({ content: 'mention someone to cuddle. `-cuddle @user`', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'you curl up alone... *it\'s peaceful at least*', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'cuddle', `Cuddled ${target.username}`);

        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)]
            .replace('{user}', `**${interaction.member.displayName}**`)
            .replace('{target}', `${target}`);
        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setDescription(`${theme.emojis.moon} ${response}\n\n+${formatSouls(reward)}`)
            .setImage(gif)
            .setColor(0x2b2d31);
        await interaction.reply({ embeds: [embed] });
    },
};
