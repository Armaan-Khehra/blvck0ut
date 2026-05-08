const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { sendLog } = require('../../utils/channelLog');

// Staff role hierarchy — highest to lowest
// Demoting removes the current role and gives the one below it
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
        .setName('demote')
        .setDescription(`${theme.emojis.skull} Demote a staff member down a rank`)
        .addUserOption(opt => opt.setName('target').setDescription('The staff member to demote').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for demotion')),

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
            return interaction.reply({ embeds: [errorEmbed('You can\'t demote yourself.')], ephemeral: true });
        }

        if (target.user.bot) {
            return interaction.reply({ embeds: [errorEmbed('Can\'t demote a bot.')], ephemeral: true });
        }

        // Find their highest staff role on the ladder
        let currentIndex = -1;
        for (let i = 0; i < ROLE_LADDER.length; i++) {
            if (target.roles.cache.has(ROLE_LADDER[i].id)) {
                currentIndex = i;
                break; // First match = their highest staff role
            }
        }

        if (currentIndex === -1) {
            return interaction.reply({ embeds: [errorEmbed('They don\'t have a staff role to demote from.')], ephemeral: true });
        }

        const currentRole = ROLE_LADDER[currentIndex];
        const nextIndex = currentIndex + 1;

        // Check that the person running the command has a higher role than the target
        // Server owner or Owner role can demote anyone
        const isOwner = interaction.member.id === interaction.guild.ownerId
            || interaction.member.roles.cache.has('1471599229255417919');
        const executorHighest = ROLE_LADDER.findIndex(r => interaction.member.roles.cache.has(r.id));
        if (!isOwner && (executorHighest === -1 || executorHighest >= currentIndex)) {
            return interaction.reply({ embeds: [errorEmbed('You can only demote people ranked below you.')], ephemeral: true });
        }

        // Already at the bottom of the ladder (Member)
        if (nextIndex >= ROLE_LADDER.length) {
            return interaction.reply({ embeds: [errorEmbed(`**${target.user.tag}** is already at the lowest rank.`)], ephemeral: true });
        }

        const newRole = ROLE_LADDER[nextIndex];

        // Remove current role, add the one below
        try {
            await target.roles.remove(currentRole.id, `Demoted by ${interaction.user.tag}: ${reason}`);
            await target.roles.add(newRole.id, `Demoted by ${interaction.user.tag}: ${reason}`);
        } catch (err) {
            return interaction.reply({ embeds: [errorEmbed(`Failed to demote: ${err.message.slice(0, 100)}`)], ephemeral: true });
        }

        sendLog(interaction.client, {
            title: `${theme.emojis.skull} Staff Demoted`,
            description: `**${target.user.tag}** has been demoted.`,
            color: theme.colors.danger,
            fields: [
                { name: `${theme.emojis.dagger} Demoted by`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.bat} Target`, value: `${target.user} (${target.user.tag})`, inline: true },
                { name: `${theme.emojis.crystal} Change`, value: `${currentRole.name} → ${newRole.name}`, inline: true },
                { name: `${theme.emojis.candle} Reason`, value: reason, inline: false },
            ],
            thumbnail: target.user.displayAvatarURL({ size: 256 }),
        });

        await interaction.reply({
            content: `${theme.emojis.skull} **${target.user.tag}** has been demoted from **${currentRole.name}** to **${newRole.name}**. Reason: ${reason}`,
        });
    },
};
