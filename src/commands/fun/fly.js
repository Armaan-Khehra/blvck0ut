const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 20;
const REWARD_MAX = 60;

const GIFS = [
    'https://media.giphy.com/media/hBoGu4sLhNPaw/giphy.gif',
    'https://media.giphy.com/media/10I2yiQCXk4aaI/giphy.gif',
    'https://media.giphy.com/media/qH1PNSJcvinDi/giphy.gif',
    'https://media.giphy.com/media/rUvOmJKlU8Hb9reWP4/giphy.gif',
];

const SOLO_RESPONSES = [
    '{user} transformed into a swarm of bats and vanished\n*the night sky swallows them whole*',
    '{user} spread their dark wings and took flight\n*gone in an instant*',
    '{user} leapt from the cathedral and soared into the blood moon\n*pure darkness*',
    '{user} shifted forms and glided over the graveyard\n*silent as death itself*',
    '{user} became one with the night\n*wings out. wind howling.*',
];

const TARGET_RESPONSES = [
    '{user} grabbed {target} and launched into the night sky\n*don\'t look down...*',
    '{user} carried {target} above the storm clouds\n*the city looks like nothing from up here*',
    '{user} swept {target} off their feet and soared into darkness\n*hold on tight*',
    '{user} flew {target} to the top of the cathedral spire\n*the view is worth the terror*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fly')
        .setDescription(`${theme.emojis.bat} Take flight into the night`)
        .addUserOption(opt => opt.setName('user').setDescription('Take someone with you')),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const name = `**${interaction.member.displayName}**`;
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'fly', 'Took flight');

        let response;
        if (target && target.id !== interaction.user.id) {
            response = TARGET_RESPONSES[Math.floor(Math.random() * TARGET_RESPONSES.length)]
                .replace('{user}', name).replace('{target}', `${target}`);
        } else {
            response = SOLO_RESPONSES[Math.floor(Math.random() * SOLO_RESPONSES.length)]
                .replace('{user}', name);
        }

        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setDescription(`${theme.emojis.bat} ${response}\n\n+${formatSouls(reward)}`)
            .setImage(gif)
            .setColor(0x2b2d31);
        await interaction.reply({ embeds: [embed] });
    },
};
