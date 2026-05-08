const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

const NUMBER_EMOJIS = ['1\uFE0F\u20E3', '2\uFE0F\u20E3', '3\uFE0F\u20E3', '4\uFE0F\u20E3'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription(`${theme.emojis.skull} Conduct a dark tribunal`)
        .addStringOption(opt => opt.setName('question').setDescription('The question to decide').setRequired(true))
        .addStringOption(opt => opt.setName('option1').setDescription('First option').setRequired(true))
        .addStringOption(opt => opt.setName('option2').setDescription('Second option').setRequired(true))
        .addStringOption(opt => opt.setName('option3').setDescription('Third option'))
        .addStringOption(opt => opt.setName('option4').setDescription('Fourth option')),

    async execute(interaction) {
        const question = interaction.options.getString('question');
        const options = [
            interaction.options.getString('option1'),
            interaction.options.getString('option2'),
            interaction.options.getString('option3'),
            interaction.options.getString('option4'),
        ].filter(Boolean);

        const description = options.map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`).join('\n\n');

        const embed = createEmbed({
            title: `${theme.emojis.skull} Dark Tribunal`,
            thumbnail: theme.gifs.poll,
            description: `**${question}**\n\n${description}\n\n${theme.divider}\n*Cast your vote by reacting below...*`,
            color: theme.colors.accent,
        });

        const msg = await interaction.reply({ embeds: [embed], fetchReply: true });

        for (let i = 0; i < options.length; i++) {
            await msg.react(NUMBER_EMOJIS[i]);
        }
    },
};
