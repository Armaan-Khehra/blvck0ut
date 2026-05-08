const { SlashCommandBuilder, REST } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');
const config = require('../../../config');
const { isStaff } = require('../../utils/giveaways');
const https = require('https');

const BOT_ROLE_ID = '1472750533193240679';

// Helper: move a custom color role just above the member's highest role
async function moveColorRole(rest, guildId, roleId, member) {
    const allRoles = await rest.get(`/guilds/${guildId}/roles`);

    // Find the member's highest role (excluding the color role itself)
    const memberRoleIds = member.roles.cache.map(r => r.id).filter(id => id !== roleId);
    const memberRoles = allRoles.filter(r => memberRoleIds.includes(r.id));
    const highestMemberRole = memberRoles.sort((a, b) => b.position - a.position)[0];

    if (!highestMemberRole) return;

    // Place the color role 1 above their highest role
    await rest.patch(`/guilds/${guildId}/roles`, {
        body: [{ id: roleId, position: highestMemberRole.position + 1 }],
    });
}

// Helper: parse a hex string to integer
function parseHex(str) {
    const clean = str.replace(/^#/, '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return { hex: clean.toUpperCase(), int: parseInt(clean, 16) };
}

// Helper: download an image URL and return base64 data URI
function downloadAsBase64(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const contentType = res.headers['content-type'] || 'image/png';
                resolve(`data:${contentType};base64,${buffer.toString('base64')}`);
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

// Helper: check if a string is ONLY a unicode emoji (no hex-like chars)
function isEmoji(str) {
    if (!str) return false;
    // Custom discord emoji
    if (/<a?:\w+:\d+>/.test(str)) return true;
    // Unicode emoji — must NOT look like a hex code
    if (/^[0-9a-fA-F#]{1,7}$/.test(str)) return false;
    // Has at least one non-ASCII char (emoji) or is a common text emoji
    return /[^\x20-\x7E]/.test(str);
}

// Helper: parse emoji from text — returns { custom, animated, id, name } or { unicode }
function parseEmoji(text) {
    if (!text) return null;
    // Custom emoji: <:name:id> or <a:name:id>
    const customMatch = text.match(/<(a?):(\w+):(\d+)>/);
    if (customMatch) {
        return {
            custom: true,
            animated: !!customMatch[1],
            name: customMatch[2],
            id: customMatch[3],
        };
    }
    // Unicode emoji
    const clean = text.trim();
    if (clean && isEmoji(clean)) {
        return { unicode: clean };
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boostcolor')
        .setDescription('Set your own custom name color (boosters & staff)')
        .addStringOption(o =>
            o.setName('hex')
                .setDescription('Hex code — one for solid, two for gradient (e.g. FF0000 00FF00)'))
        .addStringOption(o =>
            o.setName('icon')
                .setDescription('Role icon — emoji or custom emoji'))
        .addStringOption(o =>
            o.setName('name')
                .setDescription('Name for your color role (optional)')
                .setMaxLength(30)),

    async execute(interaction) {
        const member = interaction.member;

        if (!member.premiumSince && !isStaff(member)) {
            return interaction.reply({
                embeds: [errorEmbed('Only server boosters and staff can use this.')],
                ephemeral: true,
            });
        }

        // Parse all input — for prefix commands, everything is in _prefixArgs
        let rawInput = interaction._prefixArgs
            ? interaction._prefixArgs.join(' ')
            : (interaction.options.getString('hex') || '');

        // Handle remove/reset
        if (/^(remove|reset|clear|off)$/i.test(rawInput.trim())) {
            const row = db.prepare('SELECT role_id FROM boost_colors WHERE guild_id = ? AND user_id = ?')
                .get(interaction.guild.id, member.id);
            if (!row) {
                return interaction.reply({
                    embeds: [errorEmbed('You don\'t have a custom color role.')],
                    ephemeral: true,
                });
            }
            const role = interaction.guild.roles.cache.get(row.role_id);
            if (role) await role.delete('User removed custom color').catch(() => {});
            db.prepare('DELETE FROM boost_colors WHERE guild_id = ? AND user_id = ?')
                .run(interaction.guild.id, member.id);
            return interaction.reply({
                embeds: [successEmbed(`${theme.emojis.crystal} Color removed`, 'Your custom color role has been deleted.')],
                ephemeral: true,
            });
        }

        // Extract emoji from slash option or from input
        let emojiRaw = interaction.options?.getString?.('icon') || null;

        // Step 1: Extract custom emoji <:name:id> or <a:name:id> from rawInput
        if (!emojiRaw) {
            const customMatch = rawInput.match(/<a?:\w+:\d+>/);
            if (customMatch) {
                emojiRaw = customMatch[0];
                rawInput = rawInput.replace(customMatch[0], '').trim();
            }
        }

        // Step 2: Extract unicode emoji from rawInput (before hex parsing)
        // Split into tokens and check each one
        if (!emojiRaw && rawInput) {
            const tokens = rawInput.split(/\s+/);
            const emojiToken = tokens.find(t => isEmoji(t));
            if (emojiToken) {
                emojiRaw = emojiToken;
                rawInput = tokens.filter(t => t !== emojiToken).join(' ');
            }
        }

        // Step 3: Extract hex codes from what's left
        const hexMatches = rawInput.match(/(?:^|[\s,])#?([0-9a-fA-F]{6})(?=[\s,]|$)/g) || [];
        const hexCodes = hexMatches.map(h => h.trim().replace(/^#/, ''));

        // Step 4: Whatever text remains after hex + emoji extraction is the role name
        let customName = null;
        if (interaction._prefixArgs) {
            let remaining = rawInput;
            for (const h of hexMatches) {
                remaining = remaining.replace(h.trim(), '');
            }
            remaining = remaining.replace(/[#,]/g, '').trim();
            if (remaining) customName = remaining.slice(0, 30);
        } else {
            customName = interaction.options?.getString?.('name') || null;
        }

        const primary = hexCodes[0] ? parseHex(hexCodes[0]) : null;
        const secondary = hexCodes[1] ? parseHex(hexCodes[1]) : null;

        // Allow icon-only or name-only update if they already have a role
        const iconOnly = !primary && (emojiRaw || customName);

        if (!primary && !iconOnly) {
            return interaction.reply({
                embeds: [errorEmbed('Use: `-br FF0000` for solid, `-br FF0000 00FF00` for gradient, `-br 🫧` for icon only.')],
                ephemeral: true,
            });
        }
        if (hexCodes[1] && !secondary) {
            return interaction.reply({
                embeds: [errorEmbed('Invalid second hex code for gradient.')],
                ephemeral: true,
            });
        }

        const roleName = customName || `⬥ ${member.displayName}`;
        await interaction.deferReply({ ephemeral: true });

        const rest = new REST().setToken(config.token);

        // Resolve emoji to API fields
        let iconData = {};
        if (emojiRaw) {
            const emoji = parseEmoji(emojiRaw);
            if (emoji?.custom) {
                const ext = emoji.animated ? 'gif' : 'png';
                const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}?size=64`;
                try {
                    const b64 = await downloadAsBase64(url);
                    iconData = { icon: b64, unicode_emoji: null };
                } catch (err) {
                    return interaction.editReply({
                        embeds: [errorEmbed(`Couldn't download that emoji: ${err.message}`)],
                    });
                }
            } else if (emoji?.unicode) {
                iconData = { unicode_emoji: emoji.unicode, icon: null };
            }
        }

        try {
            const existing = db.prepare('SELECT role_id FROM boost_colors WHERE guild_id = ? AND user_id = ?')
                .get(interaction.guild.id, member.id);

            if (existing) {
                const role = await interaction.guild.roles.fetch(existing.role_id).catch(() => null);
                if (role) {
                    // Build update body
                    const body = { ...iconData };

                    if (primary) {
                        body.color = primary.int;
                        if (secondary) {
                            body.color = 0;
                            body.colors = {
                                primary_color: primary.int,
                                secondary_color: secondary.int,
                            };
                        } else {
                            body.colors = null;
                        }
                    }

                    if (customName) {
                        body.name = customName;
                    }

                    await rest.patch(`/guilds/${interaction.guild.id}/roles/${role.id}`, { body });

                    if (!member.roles.cache.has(role.id)) {
                        await member.roles.add(role);
                    }
                    await moveColorRole(rest, interaction.guild.id, role.id, member);

                    // Build response
                    const parts = [];
                    if (primary) {
                        const hexDisplay = secondary ? `#${primary.hex} → #${secondary.hex}` : `#${primary.hex}`;
                        db.prepare('UPDATE boost_colors SET hex = ? WHERE guild_id = ? AND user_id = ?')
                            .run(hexDisplay, interaction.guild.id, member.id);
                        parts.push(`Color: **${hexDisplay}**`);
                    }
                    if (emojiRaw) parts.push(`Icon: ${emojiRaw}`);
                    if (customName) parts.push(`Name: **${customName}**`);

                    return interaction.editReply({
                        embeds: [successEmbed(
                            `${theme.emojis.crystal} Role updated`,
                            parts.join('\n') || 'Updated.',
                        )],
                    });
                } else {
                    db.prepare('DELETE FROM boost_colors WHERE guild_id = ? AND user_id = ?')
                        .run(interaction.guild.id, member.id);
                }
            }

            // If icon-only but no existing role, need a color too
            if (iconOnly && !existing) {
                return interaction.editReply({
                    embeds: [errorEmbed('You don\'t have a color role yet. Use `-br FF0000` first to create one.')],
                });
            }

            // Create new role via REST
            const createBody = {
                name: roleName,
                color: primary.int,
                permissions: '0',
                ...iconData,
            };
            if (secondary) {
                createBody.color = 0;
                createBody.colors = {
                    primary_color: primary.int,
                    secondary_color: secondary.int,
                };
            }

            const newRole = await rest.post(`/guilds/${interaction.guild.id}/roles`, { body: createBody });

            await moveColorRole(rest, interaction.guild.id, newRole.id, member);
            await member.roles.add(newRole.id);

            const hexDisplay = secondary ? `#${primary.hex} → #${secondary.hex}` : `#${primary.hex}`;
            db.prepare('INSERT INTO boost_colors (guild_id, user_id, role_id, hex) VALUES (?, ?, ?, ?)')
                .run(interaction.guild.id, member.id, newRole.id, hexDisplay);

            const iconNote = emojiRaw ? `\nIcon: ${emojiRaw}` : '';
            return interaction.editReply({
                embeds: [successEmbed(
                    `${theme.emojis.crystal} Color set`,
                    `Your custom color **${hexDisplay}** has been created.${iconNote}`,
                )],
            });
        } catch (err) {
            return interaction.editReply({
                embeds: [errorEmbed(`Failed: ${err.message}`)],
            });
        }
    },
};
