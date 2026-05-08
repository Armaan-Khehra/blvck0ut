const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const logger = require('../../utils/logger');

const WELCOME_GIF = 'https://image2url.com/r2/default/gifs/1771202959733-2b3af6ec-89d6-4949-971b-dc4b674f1a80.gif';

const sym = {
    cross: '\u2720',
    star: '\u2726',
    dagger: '\u2020',
    diamond: '\u2662',
    lace: '\u2500\u2500\u2500\u2500 \u2726\u2720\u2726 \u2500\u2500\u2500\u2500',
};

// Profile sections — each section is one embed + one row of buttons
// mode: 'toggle' = can have multiple, 'exclusive' = only one at a time
const PROFILE_SECTIONS = [
    {
        id: 'pronouns',
        title: `${sym.cross}  P R O N O U N S`,
        subtitle: 'pick how we address you.',
        mode: 'exclusive',
        roles: [
            { label: 'she/her', roleId: '1471599229209411683', emoji: '\u2B50' },
            { label: 'he/him', roleId: '1471599229209411682', emoji: '\u{1F319}' },
            { label: 'they/them', roleId: '1471599229209411681', emoji: '\u{1F578}\uFE0F' },
            { label: 'any', roleId: '1471599229209411680', emoji: '\u2728' },
            { label: 'other', roleId: '1471599229209411679', emoji: '\u{1F5A4}' },
        ],
    },
    {
        id: 'gender',
        title: `${sym.cross}  G E N D E R`,
        subtitle: 'choose your identity.',
        mode: 'exclusive',
        roles: [
            { label: 'male', roleId: '1471599229209411677', emoji: '\u{1F5E1}\uFE0F' },
            { label: 'female', roleId: '1471599228819214492', emoji: '\u{1F339}' },
            { label: 'non binary', roleId: '1471599228819214491', emoji: '\u{1F52E}' },
            { label: 'gender fluid', roleId: '1471599228819214490', emoji: '\u{1F311}' },
        ],
    },
    {
        id: 'age',
        title: `${sym.cross}  A G E`,
        subtitle: 'select your age range.',
        mode: 'exclusive',
        roles: [
            { label: '16-17', roleId: '1471610618250527035', emoji: '\u{1F578}\uFE0F' },
            { label: '18-19', roleId: '1475992262654693518', emoji: '\u{1F577}\uFE0F' },
            { label: '20+', roleId: '1471610667155980455', emoji: '\u2B50' },
        ],
    },
    {
        id: 'dms',
        title: `${sym.cross}  D M s`,
        subtitle: 'let people know if they can message you.',
        mode: 'exclusive',
        roles: [
            { label: 'dms open', roleId: '1471599229221732529', emoji: '\u{1F4EC}' },
            { label: 'dms closed', roleId: '1471599229221732528', emoji: '\u{1F512}' },
        ],
    },
    {
        id: 'pings',
        title: `${sym.cross}  P I N G S`,
        subtitle: 'choose which pings you want to receive.',
        mode: 'toggle',
        roles: [
            { label: 'announcements', roleId: '1471599229221732527', emoji: '\u{1F4E2}' },
            { label: 'welcome ping', roleId: '1471599229209411686', emoji: '\u{1F44B}' },
            { label: 'chat revive', roleId: '1471599229209411685', emoji: '\u{1F525}' },
            { label: 'partnerships', roleId: '1474785256237170748', emoji: '\u{1F91D}' },
            { label: 'bump remind', roleId: '1500116182890450984', emoji: '\u{1F514}' },
        ],
    },
];

module.exports = {
    // Export sections so interactionCreate can use them
    PROFILE_SECTIONS,

    data: new SlashCommandBuilder()
        .setName('profilepanel')
        .setDescription(`${theme.emojis.crystal} Summon the profile altar`)
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Channel to send the profile panels to')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel');

        if (!channel.isTextBased()) {
            return interaction.editReply({ embeds: [errorEmbed('That channel cannot hold messages.')] });
        }

        try {
            for (const section of PROFILE_SECTIONS) {
                // Build buttons
                const row = new ActionRowBuilder();
                for (const role of section.roles) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`profile_${section.id}_${role.roleId}`)
                            .setLabel(role.label)
                            .setEmoji(role.emoji)
                            .setStyle(ButtonStyle.Secondary)
                    );
                }

                // Build role preview lines
                const roleLines = section.roles
                    .map(r => `\u2002\u2002${sym.dagger} ${r.emoji} \u2002<@&${r.roleId}>`)
                    .join('\n');

                const modeHint = section.mode === 'toggle'
                    ? `${sym.star} you can select multiple`
                    : `${sym.star} selecting a new option replaces the old`;

                // Build embed
                const embed = new EmbedBuilder()
                    .setColor(0x1a1a2e)
                    .setAuthor({ name: section.title })
                    .setDescription([
                        `> *\u2002${sym.diamond} ${section.subtitle} ${sym.diamond}\u2002*`,
                        '',
                        roleLines,
                        '',
                        `\u2002\u2002\u2002${sym.lace}`,
                        '',
                        `\u2002\u2002*${modeHint}*`,
                        `\u2002\u2002*${sym.star} click again to remove*`,
                    ].join('\n'))
                    .setFooter({ text: `${sym.cross} blvck0ut \u2022 profile altar \u2022 ${sym.cross}` });

                await channel.send({ embeds: [embed], components: [row] });
            }

            await interaction.editReply({
                embeds: [successEmbed(
                    `${theme.emojis.crystal} Profile altar summoned`,
                    `All profile panels have been placed in ${channel}.`,
                )],
            });
        } catch (error) {
            logger.error('Failed to create profile panels:', error);
            await interaction.editReply({
                embeds: [errorEmbed(`Failed to send the panels: ${error.message}`)],
            });
        }
    },
};
