const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');
const { sendLog } = require('../../utils/channelLog');

const lockUser = db.prepare(
    'INSERT OR REPLACE INTO uwu_locked (guild_id, user_id, locked_by) VALUES (?, ?, ?)'
);
const isLocked = db.prepare(
    'SELECT * FROM uwu_locked WHERE guild_id = ? AND user_id = ?'
);
const getAllLocked = db.prepare(
    'SELECT user_id FROM uwu_locked WHERE guild_id = ?'
);
const lockAll = db.prepare(
    'INSERT OR REPLACE INTO uwu_locked (guild_id, user_id, locked_by) VALUES (?, ?, ?)'
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uwulock')
        .setDescription(`${theme.emojis.crystal} Curse a soul to speak in uwu`)
        .addUserOption(opt => opt.setName('target').setDescription('The victim').setRequired(false))
        .addStringOption(opt => opt.setName('scope').setDescription('"all" to curse everyone').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Check for "all" — via slash command option or prefix arg
        const scope = interaction.options.getString('scope')
            || (interaction._prefixArgs && interaction._prefixArgs[0]);

        if (scope && scope.toLowerCase() === 'all') {
            await interaction.deferReply();

            const members = await interaction.guild.members.fetch();
            let count = 0;

            const lockMany = db.transaction((entries) => {
                for (const entry of entries) {
                    lockUser.run(entry.guildId, entry.userId, entry.lockedBy);
                    count++;
                }
            });

            const entries = [];
            for (const [id, member] of members) {
                if (member.user.bot) continue;
                if (isLocked.get(interaction.guild.id, id)) continue;
                entries.push({ guildId: interaction.guild.id, userId: id, lockedBy: interaction.user.id });
            }

            lockMany(entries);

            sendLog(interaction.client, {
                title: `${theme.emojis.crystal} Mass UwU Curse`,
                description: `All members have been cursed with uwu.`,
                color: theme.colors.primary,
                fields: [
                    { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: `${theme.emojis.skull} Cursed`, value: `${count} members`, inline: true },
                ],
            });

            return interaction.editReply({
                embeds: [successEmbed(
                    `${theme.emojis.crystal} Mass UwU Curse`,
                    `**${count}** members have been cursed with uwu.\nThe entire server speaks in uwu now.`,
                    theme.gifs.uwu,
                )],
            });
        }

        // Single target mode
        const target = interaction.options.getUser('target');
        if (!target) {
            return interaction.reply({ embeds: [errorEmbed('Specify a target or use `-uwulock all`.')], ephemeral: true });
        }

        if (target.bot) {
            return interaction.reply({ embeds: [errorEmbed('Machines cannot be cursed with uwu.')], ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ embeds: [errorEmbed('You cannot curse yourself... or can you? No. You can\'t.')], ephemeral: true });
        }

        // Check role hierarchy — can't uwulock someone with a higher or equal role
        const executorMember = interaction.member;
        const targetMember = interaction.guild.members.cache.get(target.id)
            || await interaction.guild.members.fetch(target.id).catch(() => null);

        if (targetMember && targetMember.roles.highest.position >= executorMember.roles.highest.position) {
            return interaction.reply({ embeds: [errorEmbed('You cannot curse someone with a higher or equal role.')], ephemeral: true });
        }

        const existing = isLocked.get(interaction.guild.id, target.id);
        if (existing) {
            return interaction.reply({ embeds: [errorEmbed(`**${target.tag}** is already cursed with uwu!`)], ephemeral: true });
        }

        lockUser.run(interaction.guild.id, target.id, interaction.user.id);

        sendLog(interaction.client, {
            title: `${theme.emojis.crystal} UwU Lock Applied`,
            description: `**${target.tag}** has been cursed with uwu.`,
            color: theme.colors.primary,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.skull} Target`, value: `${target} (${target.tag})`, inline: true },
            ],
            thumbnail: target.displayAvatarURL({ size: 256 }),
        });

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.crystal} UwU Locked`,
                `**${target.tag}** now speaks in uwu.`,
                theme.gifs.uwu,
            )],
        });
    },
};
