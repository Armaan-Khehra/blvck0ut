const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');
const logger = require('../../utils/logger');

const WELCOME_GIF = 'https://image2url.com/r2/default/gifs/1771202959733-2b3af6ec-89d6-4949-971b-dc4b674f1a80.gif';

// Gradient color roles — order matches the button layout
const GRADIENT_COLORS = [
    // Row 1: Dark reds & pinks
    { label: 'Bloodmoon', roleId: '1472892921232625686' },
    { label: 'Crimson Veil', roleId: '1472893073401970740' },
    { label: 'Shadow Rose', roleId: '1472893188892004425' },
    { label: 'Neon Bleed', roleId: '1472894161899225190' },
    { label: 'Hot Pulse', roleId: '1472894240030851234' },

    // Row 2: Purples
    { label: 'Nightshade', roleId: '1472893282471383101' },
    { label: 'Void Purple', roleId: '1472893369578553366' },
    { label: 'Phantom Orchid', roleId: '1472893484833837082' },
    { label: 'Electric Violet', roleId: '1472894425746378872' },
    { label: 'Plasma', roleId: '1472894517433598118' },

    // Row 3: Blues & teals
    { label: 'Abyssal Blue', roleId: '1472893590517842021' },
    { label: 'Obsidian Teal', roleId: '1472893686374338562' },
    { label: 'Cyber Indigo', roleId: '1472894614087401579' },
    { label: 'Neon Cobalt', roleId: '1472894744869994630' },
    { label: 'Ice Surge', roleId: '1472894838927134811' },

    // Row 4: Greens, yellows, oranges
    { label: 'Hemlock', roleId: '1472893806658457712' },
    { label: 'Acid', roleId: '1472894915749871659' },
    { label: 'Toxic Lime', roleId: '1472895012609200128' },
    { label: 'Solar Flare', roleId: '1472895101889019976' },
    { label: 'Burnout', roleId: '1472895179513135156' },

    // Row 5: Neutrals + Toxic Fuchsia
    { label: 'Ash', roleId: '1472893895640879278' },
    { label: 'Wraith', roleId: '1472893992583827605' },
    { label: 'Bone White', roleId: '1472894080387256410' },
    { label: 'Toxic Fuchsia', roleId: '1472894324143427847' },
];

const insertColor = db.prepare(`
    INSERT OR REPLACE INTO color_roles (guild_id, role_id, label) VALUES (?, ?, ?)
`);

const insertPanel = db.prepare(`
    INSERT INTO color_panels (guild_id, channel_id, message_id) VALUES (?, ?, ?)
`);

// Gothic decorative elements
const sym = {
    cross: '\u2720',
    star: '\u2726',
    dot: '\u2022',
    diamond: '\u2662',
    fleur: '\u269C',
    dagger: '\u2020',
    sect: '\u00A7',
    lace: '\u2500\u2500\u2500\u2500 \u2726\u2720\u2726 \u2500\u2500\u2500\u2500',
    divTop: '\u2508'.repeat(28),
    divBot: '\u2508'.repeat(28),
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('colorpanel')
        .setDescription(`${theme.emojis.crystal} Summon the color altar`)
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Channel to send the color panel to')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel');

        if (!channel.isTextBased()) {
            return interaction.editReply({ embeds: [errorEmbed('That channel cannot hold messages.')] });
        }

        // Build button rows (5 buttons per row)
        const rows = [];
        for (let i = 0; i < GRADIENT_COLORS.length; i += 5) {
            const row = new ActionRowBuilder();
            const chunk = GRADIENT_COLORS.slice(i, i + 5);

            for (const color of chunk) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`color_${color.roleId}`)
                        .setLabel(color.label)
                        .setStyle(ButtonStyle.Secondary)
                );
            }
            rows.push(row);
        }

        // Build role mention lines — each role on its own line with a gothic bullet
        const groups = [
            {
                header: `${sym.cross} \u2002**\u2500\u2500 Blood & Thorns \u2500\u2500**`,
                indices: [0, 1, 2, 3, 4, 23],
            },
            {
                header: `${sym.cross} \u2002**\u2500\u2500 Veil of Shadows \u2500\u2500**`,
                indices: [5, 6, 7, 8, 9],
            },
            {
                header: `${sym.cross} \u2002**\u2500\u2500 Abyssal Depths \u2500\u2500**`,
                indices: [10, 11, 12, 13, 14],
            },
            {
                header: `${sym.cross} \u2002**\u2500\u2500 Poison Garden \u2500\u2500**`,
                indices: [15, 16, 17, 18, 19],
            },
            {
                header: `${sym.cross} \u2002**\u2500\u2500 Bone & Ash \u2500\u2500**`,
                indices: [20, 21, 22],
            },
        ];

        const colorLines = [];
        for (const group of groups) {
            colorLines.push('');
            colorLines.push(group.header);
            for (const idx of group.indices) {
                const c = GRADIENT_COLORS[idx];
                colorLines.push(`\u2002\u2002${sym.dagger} <@&${c.roleId}>`);
            }
        }

        // Main embed
        const embed = new EmbedBuilder()
            .setColor(0x1a1a2e)
            .setAuthor({ name: '\u2726 \u2022 C O L O R \u2002A L T A R \u2022 \u2726' })
            .setDescription([
                `\u2002`,
                `> *\u2002${sym.diamond} choose your gradient to mark your presence ${sym.diamond}\u2002*`,
                '',
                `\u2002\u2002${sym.star} click a button to claim a color`,
                `\u2002\u2002${sym.star} clicking a new color replaces the old`,
                `\u2002\u2002${sym.star} click your current color to remove it`,
                '',
                `\u2002\u2002\u2002${sym.lace}`,
                ...colorLines,
                '',
                `\u2002\u2002\u2002${sym.lace}`,
                '',
                `\u2002\u2002\u2002*\u2720 embrace the void \u2720*`,
            ].join('\n'))
            .setThumbnail(WELCOME_GIF)
            .setFooter({ text: `${sym.cross} blvck0ut \u2022 color altar \u2022 ${sym.cross}` })
            .setTimestamp();

        try {
            const panelMessage = await channel.send({ embeds: [embed], components: rows });

            const insertColors = db.transaction(() => {
                for (const color of GRADIENT_COLORS) {
                    insertColor.run(interaction.guild.id, color.roleId, color.label);
                }
                insertPanel.run(interaction.guild.id, channel.id, panelMessage.id);
            });
            insertColors();

            await interaction.editReply({
                embeds: [successEmbed(
                    `${theme.emojis.crystal} Altar summoned`,
                    `The color panel has been placed in ${channel}.`,
                )],
            });
        } catch (error) {
            logger.error('Failed to create color panel:', error);
            await interaction.editReply({
                embeds: [errorEmbed(`Failed to send the panel: ${error.message}`)],
            });
        }
    },
};
