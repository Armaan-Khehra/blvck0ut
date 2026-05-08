const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');
const { sendLog } = require('../../utils/channelLog');

const upsert = db.prepare(`
    INSERT INTO guild_config (guild_id, autorole_id) VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET autorole_id = excluded.autorole_id
`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setautorole')
        .setDescription(`${theme.emojis.chain} Bestow a mark upon newcomers`)
        .addRoleOption(opt => opt.setName('role').setDescription('The role to bestow').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const role = interaction.options.getRole('role');
        upsert.run(interaction.guild.id, role.id);

        sendLog(interaction.client, {
            title: `${theme.emojis.chain} Autorole Updated`,
            description: `The autorole has been changed.`,
            color: theme.colors.success,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.moon} Role`, value: `${role} (${role.name})`, inline: true },
            ],
        });

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.chain} Mark set`,
                `All newcomers shall receive the **${role.name}** role.`,
            )],
        });
    },
};
