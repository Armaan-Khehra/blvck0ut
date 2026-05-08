const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

const RESPONSES = [
    'The spirits say... **yes**.',
    'The void whispers... **no**.',
    'The bones have spoken: **without a doubt**.',
    'The shadows are unclear. **Ask again**.',
    "Death's answer is certain: **never**.",
    'The crypt echoes with **affirmation**.',
    'The ravens circle in **denial**.',
    'Fate is sealed. **It is so**.',
    'The dead are **silent** on this matter...',
    'A spectral hand points to **yes**.',
    'The darkness murmurs **perhaps**.',
    'The tombstone reads: **absolutely not**.',
    'The candle flickers **yes**... then goes out.',
    'The spirits are **divided**. Try again.',
    'A voice from beyond: **it is certain**.',
    'The ouija board spells: **doubtful**.',
    'The black cat crosses your path. **Bad omen**.',
    'The mirror shows **a favorable outcome**.',
    'The pendulum swings toward **no**.',
    'The tea leaves reveal: **most likely**.',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription(`${theme.emojis.crystal} Consult the obsidian oracle`)
        .addStringOption(opt => opt.setName('question').setDescription('Your question for the oracle').setRequired(true)),

    async execute(interaction) {
        const question = interaction.options.getString('question');
        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

        await interaction.reply({
            embeds: [createEmbed({
                title: `${theme.emojis.crystal} The Obsidian Oracle`,
                description: `**Your question:**\n> ${question}\n\n**The oracle speaks:**\n${response}`,
                color: theme.colors.accent,
                thumbnail: theme.gifs.oracle,
            })],
        });
    },
};
