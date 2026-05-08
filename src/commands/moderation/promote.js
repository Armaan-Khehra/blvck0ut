const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { sendLog } = require('../../utils/channelLog');

// Staff role hierarchy — highest to lowest
const ROLE_LADDER = [
    { id: '1471599229255417919', name: 'Owner' },
    { id: '1471599229255417918', name: 'Admin' },
    { id: '1471599229221732536', name: 'Senior Mod' },
    { id: '1496310444522999898', name: 'Mod' },
    { id: '1499936239078473889', name: 'Trial Mod' },
    { id: '1498927541321207870', name: 'Head PM' },
    { id: '1471599229221732535', name: 'PM' },
    { id: '1471599229221732533', name: 'Member' },
];

// Roles allowed to use promote/demote (Head PM and above)
const ALLOWED_ROLES = new Set(ROLE_LADDER.slice(0, 6).map(r => r.id)); // Owner → Head PM

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promote')
        .setDescription(`${theme.emojis.crystal} Promote a member up a rank`)
        .addUserOption(opt => opt.setName('target').setDescription('The member to promote').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for promotion')),

    async execute(interaction) {
        // Permission check — Head PM and above can use this
        const hasPermission = interaction.member.roles.cache.some(r => ALLOWED_ROLES.has(r.id))
            || interaction.member.id === interaction.guild.ownerId;
        if (!hasPermission) {
            return interaction.reply({ embeds: [errorEmbed('You need Head PM or higher to use this.')], ephemeral: true });
        }

        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'No reason given';

        if (!target) {
            return interaction.reply({ embeds: [errorEmbed('That user isn\'t in the server.')], ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ embeds: [errorEmbed('You can\'t promote yourself.')], ephemeral: true });
        }

        if (target.user.bot) {
            return interaction.reply({ embeds: [errorEmbed('Can\'t promote a bot.')], ephemeral: true });
        }

        // Find their highest role on the ladder
        let currentIndex = -1;
        for (let i = 0; i < ROLE_LADDER.length; i++) {
            if (target.roles.cache.has(ROLE_LADDER[i].id)) {
                currentIndex = i;
                break;
            }
        }

        // If they have no ladder role, they start below Member — promote to Member
        if (currentIndex === -1) {
            currentIndex = ROLE_LADDER.length; // below the bottom
        }

        const prevIndex = currentIndex - 1;

        if (prevIndex < 0) {
            return interaction.reply({ embeds: [errorEmbed(`**${target.user.tag}** is already at the highest rank.`)], ephemeral: true });
        }

        const newRole = ROLE_LADDER[prevIndex];

        // Server owner or Owner role can promote anyone
        // Others can only promote to a rank below their own
        const isOwner = interaction.member.id === interaction.guild.ownerId
            || interaction.member.roles.cache.has('1471599229255417919');
        const executorHighest = ROLE_LADDER.findIndex(r => interaction.member.roles.cache.has(r.id));

        if (!isOwner && (executorHighest === -1 || prevIndex <= executorHighest)) {
            return interaction.reply({ embeds: [errorEmbed('You can only promote people to a rank below yours.')], ephemeral: true });
        }

        // Remove current role (if they have one on the ladder), add the one above
        try {
            if (currentIndex < ROLE_LADDER.length) {
                await target.roles.remove(ROLE_LADDER[currentIndex].id, `Promoted by ${interaction.user.tag}: ${reason}`);
            }
            await target.roles.add(newRole.id, `Promoted by ${interaction.user.tag}: ${reason}`);
        } catch (err) {
            return interaction.reply({ embeds: [errorEmbed(`Failed to promote: ${err.message.slice(0, 100)}`)], ephemeral: true });
        }

        const oldName = currentIndex < ROLE_LADDER.length ? ROLE_LADDER[currentIndex].name : 'None';

        sendLog(interaction.client, {
            title: `${theme.emojis.crystal} Staff Promoted`,
            description: `**${target.user.tag}** has been promoted.`,
            color: theme.colors.success,
            fields: [
                { name: `${theme.emojis.dagger} Promoted by`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.bat} Target`, value: `${target.user} (${target.user.tag})`, inline: true },
                { name: `${theme.emojis.crystal} Change`, value: `${oldName} → ${newRole.name}`, inline: true },
                { name: `${theme.emojis.candle} Reason`, value: reason, inline: false },
            ],
            thumbnail: target.user.displayAvatarURL({ size: 256 }),
        });

        await interaction.reply({
            content: `${theme.emojis.crystal} **${target.user.tag}** has been promoted from **${oldName}** to **${newRole.name}**. Reason: ${reason}`,
        });
    },
};
