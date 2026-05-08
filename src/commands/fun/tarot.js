const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const tarotCards = require('../../data/tarotCards');

function drawCards(count) {
    const deck = [...tarotCards];
    const drawn = [];
    for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * deck.length);
        const card = deck.splice(index, 1)[0];
        const isReversed = Math.random() < 0.3;
        drawn.push({ ...card, isReversed });
    }
    return drawn;
}

function formatCard(card, label) {
    const orientation = card.isReversed ? '(Reversed)' : '(Upright)';
    const meaning = card.isReversed ? card.reversed : card.meaning;
    const numeral = card.numeral ? ` ${card.numeral} \u2022` : '';

    return [
        `**${label}**`,
        `${card.emoji} **${card.name}**${numeral} ${orientation}`,
        `> ${meaning}`,
    ].join('\n');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tarot')
        .setDescription(`${theme.emojis.crystal} Draw from the deck of shadows`)
        .addStringOption(opt =>
            opt.setName('spread').setDescription('Choose your spread')
                .addChoices(
                    { name: 'Single Card', value: 'single' },
                    { name: 'Past \u2022 Present \u2022 Future', value: 'ppf' },
                )),

    async execute(interaction) {
        const spread = interaction.options.getString('spread') || 'single';

        if (spread === 'single') {
            const [card] = drawCards(1);
            const orientation = card.isReversed ? '(Reversed)' : '(Upright)';
            const meaning = card.isReversed ? card.reversed : card.meaning;

            await interaction.reply({
                embeds: [createEmbed({
                    title: `${theme.emojis.crystal} The Deck of Shadows`,
            thumbnail: theme.gifs.tarot,
                    description: [
                        `${card.emoji} **${card.name}** ${card.numeral ? card.numeral + ' \u2022 ' : ''}${orientation}`,
                        '',
                        `> ${meaning}`,
                        '',
                        `*The card has spoken. Heed its message...*`,
                    ].join('\n'),
                    color: theme.colors.accent,
                })],
            });
        } else {
            const cards = drawCards(3);
            const labels = [
                `${theme.emojis.moon} **Past**`,
                `${theme.emojis.crystal} **Present**`,
                `${theme.emojis.skull} **Future**`,
            ];

            const reading = cards.map((card, i) => formatCard(card, labels[i])).join('\n\n');

            await interaction.reply({
                embeds: [createEmbed({
                    title: `${theme.emojis.crystal} Past \u2022 Present \u2022 Future`,
                    description: `${reading}\n\n*The threads of fate are woven. What will you do with this knowledge?*`,
                    color: theme.colors.accent,
                })],
            });
        }
    },
};
