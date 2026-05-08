const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');
const { sendLog } = require('../../utils/channelLog');

const unlockUser = db.prepare(
    'DELETE FROM uwu_locked WHERE guild_id = ? AND user_id = ?'
);
const isLocked = db.prepare(
    'SELECT * FROM uwu_locked WHERE guild_id = ? AND user_id = ?'
);
const unlockAll = db.prepare(
    'DELETE FROM uwu_locked WHERE guild_id = ?'
);
const countLocked = db.prepare(
    'SELECT COUNT(*) as count FROM uwu_locked WHERE guild_id = ?'
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uwuunlock')
        .setDescription(`${theme.emojis.coffin} Free a soul from the uwu curse`)
        .addUserOption(opt => opt.setName('target').setDescription('The cursed soul to free').setRequired(false))
        .addStringOption(opt => opt.setName('scope').setDescription('"all" to free everyone').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Check for "all" — via slash command option or prefix arg
        const scope = interaction.options.getString('scope')
            || (interaction._prefixArgs && interaction._prefixArgs[0]);

        if (scope && scope.toLowerCase() === 'all') {
            const { count } = countLocked.get(interaction.guild.id);

            if (count === 0) {
                return interaction.reply({ embeds: [errorEmbed('No one is uwu cursed.')], ephemeral: true });
            }

            unlockAll.run(interaction.guild.id);

            sendLog(interaction.client, {
                title: `${theme.emojis.coffin} Mass UwU Curse Lifted`,
                description: `All uwu curses have been lifted.`,
                color: theme.colors.primary,
                fields: [
                    { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: `${theme.emojis.skull} Freed`, value: `${count} members`, inline: true },
                ],
            });

            return interaction.reply({
                embeds: [successEmbed(
                    `${theme.emojis.coffin} Mass UwU Curse Lifted`,
                    `**${count}** members have been freed from the uwu curse.\nThe server may speak normally once more.`,
                    theme.gifs.uwu,
                )],
            });
        }

        // Single target mode
        const target = interaction.options.getUser('target');
        if (!target) {
            return interaction.reply({ embeds: [errorEmbed('Specify a target or use `-uwuunlock all`.')], ephemeral: true });
        }

        // Check role hierarchy — can't uwuunlock someone with a higher or equal role
        const executorMember = interaction.member;
        const targetMember = interaction.guild.members.cache.get(target.id)
            || await interaction.guild.members.fetch(target.id).catch(() => null);

        if (targetMember && targetMember.roles.highest.position >= executorMember.roles.highest.position) {
            return interaction.reply({ embeds: [errorEmbed('You cannot lift the curse on someone with a higher or equal role.')], ephemeral: true });
        }

        const existing = isLocked.get(interaction.guild.id, target.id);
        if (!existing) {
            return interaction.reply({ embeds: [errorEmbed(`**${target.tag}** is not uwu cursed.`)], ephemeral: true });
        }

        unlockUser.run(interaction.guild.id, target.id);

        sendLog(interaction.client, {
            title: `${theme.emojis.coffin} UwU Curse Lifted`,
            description: `**${target.tag}** has been freed from the uwu curse.`,
            color: theme.colors.primary,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.skull} Target`, value: `${target} (${target.tag})`, inline: true },
            ],
            thumbnail: target.displayAvatarURL({ size: 256 }),
        });

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.coffin} UwU Curse Lifted`,
                `**${target.tag}** has been freed from the uwu curse.\nThey may speak normally once more.`,
                theme.gifs.uwu,
            )],
        });
    },
};
