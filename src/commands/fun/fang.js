const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 20;
const REWARD_MAX = 50;

const GIFS = [
    'https://media.giphy.com/media/Gn5E6WOBnEAGQ/giphy.gif',
    'https://media.giphy.com/media/ydTS9VVxs8tvE0CBh5/giphy.gif',
    'https://media.giphy.com/media/lMC4rEVuH0IN20fiFo/giphy.gif',
    'https://media.giphy.com/media/i4LQvXX3f887dm7XZX/giphy.gif',
];

const SOLO_RESPONSES = [
    '{user} bared their fangs under the moonlight\n*back off. final warning.*',
    '{user} let the fangs show with a cold grin\n*the hunger is showing*',
    '{user} hissed — fangs fully extended\n*feeding time approaches*',
    '{user} ran their tongue over razor-sharp fangs\n*something wicked this way comes*',
    '{user} grinned wide, fangs gleaming in the dark\n*the message is clear*',
];

const TARGET_RESPONSES = [
    '{user} flashed their fangs at {target}\n*that\'s not a smile. that\'s a warning.*',
    '{user} bared their fangs at {target} and hissed\n*one wrong move...*',
    '{user} leaned in close to {target} — fangs out\n*can you feel the cold?*',
    '{user} growled at {target} with fangs fully extended\n*this isn\'t a game anymore*',
    '{user} showed {target} their fangs\n*consider that a promise, not a threat*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fang')
        .setDescription(`${theme.emojis.spider} Flash your fangs`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to bare your fangs at')),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const name = `**${interaction.member.displayName}**`;
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'fang', 'Showed fangs');

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
            .setDescription(`${theme.emojis.spider} ${response}\n\n+${formatSouls(reward)}`)
            .setImage(gif)
            .setColor(0x2b2d31);
        await interaction.reply({ embeds: [embed] });
    },
};
