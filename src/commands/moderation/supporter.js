const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { SUPPORTER_ROLE_ID } = require('../../events/guildMemberUpdate');

// Mod and above can use this
const ALLOWED_ROLES = new Set([
    '1471599229255417919', // Owner
    '1471599229255417918', // Admin
    '1471599229221732536', // Senior Mod
    '1496310444522999898', // Mod
]);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('supporter')
        .setDescription(`${theme.emojis.crystal} Manually give or remove the supporter role`)
        .addStringOption(opt =>
            opt.setName('action')
                .setDescription('Add or remove the supporter role')
                .setRequired(true)
                .addChoices(
                    { name: 'Give', value: 'give' },
                    { name: 'Remove', value: 'remove' },
                ))
        .addUserOption(opt =>
            opt.setName('target')
                .setDescription('The member to give/remove supporter role')
                .setRequired(true)),

    async execute(interaction) {
        const hasPermission = interaction.member.roles.cache.some(r => ALLOWED_ROLES.has(r.id))
            || interaction.member.id === interaction.guild.ownerId;
        if (!hasPermission) {
            return interaction.reply({ embeds: [errorEmbed('You need Mod or higher to use this.')], ephemeral: true });
        }

        const target = interaction.options.getMember('target');
        const action = interaction.options.getString('action');

        if (!target) {
            return interaction.reply({ embeds: [errorEmbed('That user isn\'t in the server.')], ephemeral: true });
        }

        const hasRole = target.roles.cache.has(SUPPORTER_ROLE_ID);

        if (action === 'give') {
            if (hasRole) {
                return interaction.reply({ embeds: [errorEmbed(`**${target.user.tag}** already has the supporter role.`)], ephemeral: true });
            }
            try {
                await target.roles.add(SUPPORTER_ROLE_ID, `Manually given by ${interaction.user.tag}`);
            } catch (err) {
                return interaction.reply({ embeds: [errorEmbed(`Failed: ${err.message.slice(0, 100)}`)], ephemeral: true });
            }

            const embed = createEmbed({
                title: `${theme.emojis.crystal} Supporter Role Given`,
                description: `**${target.user.tag}** has been given the supporter role by ${interaction.user}.`,
                color: theme.colors.accent,
            });
            await interaction.reply({ embeds: [embed] });

        } else {
            if (!hasRole) {
                return interaction.reply({ embeds: [errorEmbed(`**${target.user.tag}** doesn't have the supporter role.`)], ephemeral: true });
            }
            try {
                await target.roles.remove(SUPPORTER_ROLE_ID, `Manually removed by ${interaction.user.tag}`);
            } catch (err) {
                return interaction.reply({ embeds: [errorEmbed(`Failed: ${err.message.slice(0, 100)}`)], ephemeral: true });
            }

            const embed = createEmbed({
                title: `${theme.emojis.skull} Supporter Role Removed`,
                description: `**${target.user.tag}** has had the supporter role removed by ${interaction.user}.`,
                color: theme.colors.danger,
            });
            await interaction.reply({ embeds: [embed] });
        }
    },
};
