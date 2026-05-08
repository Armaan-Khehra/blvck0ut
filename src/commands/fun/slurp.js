const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 50;
const REWARD_MAX = 120;

const GIFS = [
    'https://media.giphy.com/media/HVvu7x53ZsrgweXCsE/giphy.gif',
    'https://media.giphy.com/media/t2uhxaoUQUcdAZc1nV/giphy.gif',
    'https://media.giphy.com/media/if9niVFg4IwAE/giphy.gif',
    'https://media.giphy.com/media/vkG6V6ZoLWaPu/giphy.gif',
];

const RESPONSES = [
    '{user} drank from {target}\'s veins\n*type O... exquisite taste*',
    '{user} slurped every last drop from {target}\n*didn\'t leave a single drop behind*',
    '{user} drained {target} slowly, savoring the taste\n*their eyes went dark...*',
    '{user} bit into {target}\'s wrist and drank deep\n*the thirst is finally satisfied*',
    '{user} fed on {target} under the moonlight\n*a crimson trail stains the ground*',
    '{user} took a long sip from {target}\n*refreshing. they needed that.*',
    '{user} latched onto {target} and wouldn\'t let go\n*the hunger consumed them*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slurp')
        .setDescription(`${theme.emojis.rose} Drain someone's blood`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to feed on').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (!target) {
            return interaction.reply({ content: 'mention someone to feed on. `-slurp @user`', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'you can\'t drink your own blood...', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'slurp', `Fed on ${target.username}`);

        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)]
            .replace('{user}', `**${interaction.member.displayName}**`)
            .replace('{target}', `${target}`);
        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setDescription(`${theme.emojis.rose} ${response}\n\n+${formatSouls(reward)}`)
            .setImage(gif)
            .setColor(0x2b2d31);
        await interaction.reply({ embeds: [embed] });
    },
};
