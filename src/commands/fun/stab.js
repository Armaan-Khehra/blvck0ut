const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 40;
const REWARD_MAX = 100;

const GIFS = [
    'https://media.tenor.com/CWZylFC_-wgAAAAC/sword-anime.gif',
    'https://media.tenor.com/G9tCUL5OBcYAAAAC/stab-knife.gif',
    'https://media.tenor.com/ph5GCZ6uxJwAAAAC/betrayal-anime.gif',
    'https://media.tenor.com/eA6lO91Ut8IAAAAC/excel-saga-stabby-stab-stab.gif',
    'https://media.tenor.com/F5z3Y0KwyP8AAAAC/sao-sword-art-online-alicization.gif',
    'https://media.tenor.com/gxfcy8hc2ukAAAAC/aurelius467385-fate-stay-night-unlimited-blade-works.gif',
];

const RESPONSES = [
    '{user} drove a blade through {target}\n*the crimson bloomed like a dark rose*',
    '{user} stabbed {target} in the back\n*betrayal tastes like iron*',
    '{user} plunged a cursed dagger into {target}\n*the wound won\'t close... ever*',
    '{user} impaled {target} with a shadow blade\n*clean. precise. merciless.*',
    '{user} shanked {target} in the dark alley\n*nothing personal... actually, it was*',
    '{user} pierced {target} with a ritual knife\n*the blood feeds the sigil*',
    '{user} stuck a blade between {target}\'s ribs\n*that\'s gonna sting for eternity*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stab')
        .setDescription(`${theme.emojis.dagger} Drive a blade through someone`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to stab').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (!target) {
            return interaction.reply({ content: 'mention someone to stab. `-stab @user`', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'the blade turns away... *not yet*', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'stab', `Stabbed ${target.username}`);

        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)]
            .replace('{user}', `**${interaction.member.displayName}**`)
            .replace('{target}', `${target}`);
        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setDescription(`${theme.emojis.dagger} ${response}\n\n+${formatSouls(reward)}`)
            .setImage(gif)
            .setColor(0x2b2d31);
        await interaction.reply({ embeds: [embed] });
    },
};
