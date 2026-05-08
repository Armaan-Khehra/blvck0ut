const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 35;
const REWARD_MAX = 90;

const GIFS = [
    'https://media.tenor.com/tsZjo28JncMAAAAC/black-star-soul-eater.gif',
    'https://media.tenor.com/Fxpmgdd9rqIAAAAC/saitama-anime.gif',
    'https://media.tenor.com/pUWz5RrxBJEAAAAC/punch-anime.gif',
    'https://media.tenor.com/fBpRK7NhTt0AAAAC/yusuke-toguro.gif',
    'https://media.tenor.com/dHLCmjq-imEAAAAC/maka-black-star.gif',
    'https://media.tenor.com/RDVCPmTkvYQAAAAC/joe-vs-jose-ashita-no-joe.gif',
];

const RESPONSES = [
    '{user} punched {target} straight in the jaw\n*bones cracked like thunder*',
    '{user} landed a devastating blow on {target}\n*they flew across the graveyard*',
    '{user} decked {target} with a fist full of rage\n*the ground shook*',
    '{user} punched {target} so hard reality glitched\n*critical hit*',
    '{user} knocked {target} into orbit\n*they\'ll be back... eventually*',
    '{user} unleashed a dark-charged fist on {target}\n*the impact left a crater*',
    '{user} sucker-punched {target} out of nowhere\n*didn\'t even see it coming*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('punch')
        .setDescription(`${theme.emojis.fire} Knock someone into the afterlife`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to punch').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (!target) {
            return interaction.reply({ content: 'mention someone to punch. `-punch @user`', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'you punch yourself... *felt that one*', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'punch', `Punched ${target.username}`);

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
