const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');

const getWarnings = db.prepare(
    'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 10'
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription(`${theme.emojis.skull} View the sins inscribed upon a soul`)
        .addUserOption(opt => opt.setName('target').setDescription('The accused').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const warnings = getWarnings.all(interaction.guild.id, target.id);

        if (warnings.length === 0) {
            return interaction.reply({
                embeds: [createEmbed({
                    title: `${theme.emojis.moon} A clean soul`,
                    description: `**${target.tag}** has no recorded transgressions.`,
                })],
            });
        }

        const list = warnings.map((w, i) =>
            `**${i + 1}.** ${w.reason}\n> By <@${w.moderator_id}> \u2022 <t:${Math.floor(new Date(w.created_at).getTime() / 1000)}:R>`
        ).join('\n\n');

        await interaction.reply({
            embeds: [createEmbed({
                title: `${theme.emojis.skull} Record of sins \u2022 ${target.tag}`,
                description: list,
                color: theme.colors.danger,
                thumbnail: theme.gifs.warn,
            })],
        });
    },
};
