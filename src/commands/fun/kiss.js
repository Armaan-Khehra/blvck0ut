const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 40;
const REWARD_MAX = 90;

const GIFS = [
    'https://media.tenor.com/8nwJ0xcPkfYAAAAC/kiss-anime-kiss.gif',
    'https://media.tenor.com/6oKZnRa1pf8AAAAC/anime-kiss.gif',
    'https://media.tenor.com/FoUR5FPFYyoAAAAC/darker-than-black-dtb-hei.gif',
    'https://media.tenor.com/iwl0cmyWyzAAAAAC/anime-kiss.gif',
    'https://media.tenor.com/lgS-I9m3WTIAAAAC/the-betrayal-knows-my-name-luka-crosszeria.gif',
    'https://media.tenor.com/CpBmgE8SuPUAAAAC/anime-kiss.gif',
];

const RESPONSES = [
    '{user} pressed their cold lips against {target}\n*the world went silent*',
    '{user} kissed {target} under the blood moon\n*a forbidden ritual sealed in crimson*',
    '{user} pulled {target} close and stole a kiss\n*the shadows watched in envy*',
    '{user} kissed {target} softly in the dark\n*time stopped for the dead*',
    '{user} leaned in and kissed {target}\n*their souls intertwined for a moment*',
    '{user} placed a ghostly kiss on {target}\'s lips\n*cold... but it burned like fire*',
    '{user} kissed {target} like it was their last night alive\n*maybe it was*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription(`${theme.emojis.rose} Kiss someone in the moonlight`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to kiss').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (!target) {
            return interaction.reply({ content: 'mention someone to kiss. `-kiss @user`', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'you can\'t kiss yourself... *that\'s just sad*', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'kiss', `Kissed ${target.username}`);

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
