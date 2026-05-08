const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 30;
const REWARD_MAX = 80;

const GIFS = [
    'https://media.tenor.com/wWFm70VeC7YAAAAC/hug-darker-than-black.gif',
    'https://media.tenor.com/W2ZVJifi1tsAAAAC/hotarubi-no-more-e-b%26w.gif',
    'https://media.tenor.com/NMRUno6PmAcAAAAC/daisuke-dark.gif',
    'https://media.tenor.com/8PXbbqOhlZYAAAAC/aesthetic-hug.gif',
    'https://media.tenor.com/0GY85eIPx9UAAAAC/dtbgifs-darkerthanblack.gif',
    'https://media.tenor.com/m2BWNqQVFMAAAAAC/black-rock-shooter-brs.gif',
];

const RESPONSES = [
    '{user} wrapped their arms around {target}\n*the coldness faded... just for a moment*',
    '{user} pulled {target} into a tight embrace\n*even the dead need warmth sometimes*',
    '{user} hugged {target} under the dim candlelight\n*two lost souls clinging to each other*',
    '{user} held {target} close in the darkness\n*the shadows couldn\'t reach them here*',
    '{user} embraced {target} like they\'d never let go\n*the void felt a little less empty*',
    '{user} hugged {target} so tight their bones creaked\n*worth it*',
    '{user} wrapped {target} in a ghostly embrace\n*cold arms... but a warm soul*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription(`${theme.emojis.candle} Embrace someone in the dark`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to hug').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (!target) {
            return interaction.reply({ content: 'mention someone to hug. `-hug @user`', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'you hug yourself... *it\'s not the same*', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'hug', `Hugged ${target.username}`);

        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)]
            .replace('{user}', `**${interaction.member.displayName}**`)
            .replace('{target}', `${target}`);
        const gif = GIFS[Math.floor(Math.random() * GIFS.length)];

        const embed = new EmbedBuilder()
            .setDescription(`${theme.emojis.candle} ${response}\n\n+${formatSouls(reward)}`)
            .setImage(gif)
            .setColor(0x2b2d31);
        await interaction.reply({ embeds: [embed] });
    },
};
