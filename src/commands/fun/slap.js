const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 30;
const REWARD_MAX = 80;

const GIFS = [
    'https://media.tenor.com/P8E1HRrO6eYAAAAC/kuroshitsuji-black-butler.gif',
    'https://media.tenor.com/P7Z8oeCK1KAAAAAC/ciel-phantomhive-kuroshitsuji.gif',
    'https://media.tenor.com/Wa2YbRnnMOwAAAAC/black-clover-anime.gif',
    'https://media.tenor.com/_p0h2_N9EioAAAAC/soul-eater-squad.gif',
    'https://media.tenor.com/3yVUWwGWLpEAAAAC/darker-than-black-dtb-hei.gif',
    'https://media.tenor.com/avC8uw9Y3E0AAAAC/dark-je.gif',
];

const RESPONSES = [
    '{user} slapped {target} across the face\n*the sound echoed through the crypt*',
    '{user} backhanded {target} into next week\n*that\'s gonna leave a mark*',
    '{user} slapped the soul out of {target}\n*they felt that in the afterlife*',
    '{user} delivered a cold slap to {target}\n*know your place*',
    '{user} smacked {target} so hard the ghosts flinched\n*deserved*',
    '{user} slapped {target} with the force of a thousand curses\n*the audacity was unforgivable*',
    '{user} left a handprint on {target}\'s face\n*branded by darkness*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slap')
        .setDescription(`${theme.emojis.coffin} Slap someone into the shadow realm`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to slap').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (!target) {
            return interaction.reply({ content: 'mention someone to slap. `-slap @user`', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'you slap yourself... *wake up*', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'slap', `Slapped ${target.username}`);

        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)]
            .replace('{user}', `**${interaction.member.displayName}**`)
            .replace('{target}', `${target}`);
        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setDescription(`${theme.emojis.coffin} ${response}\n\n+${formatSouls(reward)}`)
            .setImage(gif)
            .setColor(0x2b2d31);
        await interaction.reply({ embeds: [embed] });
    },
};
