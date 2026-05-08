const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('massrole')
        .setDescription(`${theme.emojis.skull} Mass assign a role to all humans or bots`)
        .addSubcommand(sub =>
            sub.setName('humans')
                .setDescription(`${theme.emojis.skull} Give a role to every human in the server`)
                .addRoleOption(opt => opt.setName('role').setDescription('The role to assign').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('bots')
                .setDescription(`${theme.emojis.skull} Give a role to every bot in the server`)
                .addRoleOption(opt => opt.setName('role').setDescription('The role to assign').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const role = interaction.options.getRole('role');

        // Safety checks
        const botMember = interaction.guild.members.me;
        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ embeds: [errorEmbed('I lack the **Manage Roles** permission.')], ephemeral: true });
        }

        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({ embeds: [errorEmbed(`I cannot assign **${role.name}** — it is above or equal to my highest role.`)], ephemeral: true });
        }

        if (role.managed) {
            return interaction.reply({ embeds: [errorEmbed(`**${role.name}** is managed by an integration and cannot be assigned manually.`)], ephemeral: true });
        }

        await interaction.deferReply();

        const isHumans = subcommand === 'humans';
        const targetType = isHumans ? 'humans' : 'bots';

        try {
            // Fetch all members
            const members = await interaction.guild.members.fetch();

            // Filter to humans or bots that DON'T already have the role
            const targets = members.filter(m =>
                (isHumans ? !m.user.bot : m.user.bot) && !m.roles.cache.has(role.id)
            );

            if (targets.size === 0) {
                return interaction.editReply({
                    embeds: [createEmbed({
                        description: `${theme.emojis.crystal} All ${targetType} already have **${role.name}**.`,
                        color: theme.colors.accent,
                    })],
                });
            }

            // Progress update
            await interaction.editReply({
                embeds: [createEmbed({
                    description: `${theme.emojis.skull} Assigning **${role.name}** to **${targets.size}** ${targetType}... this may take a while.`,
                    color: theme.colors.primary,
                })],
            });

            let success = 0;
            let failed = 0;

            for (const [, member] of targets) {
                try {
                    await member.roles.add(role);
                    success++;
                } catch (err) {
                    failed++;
                    logger.error(`[MassRole] Failed to add ${role.name} to ${member.user.tag}: ${err.message}`);
                }

                // Small delay to avoid rate limits (1 per 100ms)
                if ((success + failed) % 10 === 0) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            const description = [
                `${theme.emojis.crystal} **${role.name}** has been assigned to ${targetType}.`,
                '',
                `${theme.emojis.skull} Successful: **${success}**`,
            ];

            if (failed > 0) {
                description.push(`${theme.emojis.dagger} Failed: **${failed}**`);
            }

            await interaction.editReply({
                embeds: [successEmbed(`Mass role complete`, description.join('\n'))],
            });
        } catch (error) {
            logger.error(`[MassRole] Error: ${error.message}`);
            await interaction.editReply({
                embeds: [errorEmbed(`Something went wrong: ${error.message}`)],
            });
        }
    },
};
