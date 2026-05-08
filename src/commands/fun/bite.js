const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const theme = require('../../utils/theme');
const { addSouls, formatSouls, applyMultiplier } = require('../../utils/economy');

const REWARD_MIN = 30;
const REWARD_MAX = 80;

const GIFS = [
    'https://media.giphy.com/media/dFqDifwneTBaU/giphy.gif',
    'https://media.giphy.com/media/b6mpA0JrIUsFSdhG9q/giphy.gif',
    'https://media.giphy.com/media/103GLZ7WCxJFLi/giphy.gif',
    'https://media.giphy.com/media/klEzWlIrmBW5b8tkse/giphy.gif',
];

const RESPONSES = [
    '{user} sinks their fangs deep into {target}\'s neck.. *the venom spreads*',
    '{user} bit {target} under the blood moon.. *they\'ll turn by midnight*',
    '{user} left two puncture marks on {target}\'s wrist.. *the wound won\'t heal*',
    '{user} went straight for {target}\'s throat.. *no mercy*',
    '{user} latched onto {target} like they haven\'t fed in centuries',
    '{user} bit {target} and welcomed them to the bloodline.. *no going back*',
    '{user} pierced {target}\'s skin with razor-sharp fangs.. *crimson drips down*',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bite')
        .setDescription(`${theme.emojis.dagger} Sink your fangs into someone`)
        .addUserOption(opt => opt.setName('user').setDescription('Who to bite').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (!target) {
            return interaction.reply({ content: 'mention someone to bite. `-bite @user`', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'you can\'t bite yourself...', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const baseReward = Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) + REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, userId, baseReward, interaction.member);
        addSouls(guildId, userId, reward, 'bite', `Bit ${target.username}`);

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
