const { Events } = require('discord.js');
const { createEmbed } = require('../utils/embeds');
const theme = require('../utils/theme');
const db = require('../data/database');
const { sendLog } = require('../utils/channelLog');

const getConfig = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member) {
        const roles = member.roles.cache
            .filter(r => r.id !== member.guild.id)
            .map(r => r.name)
            .join(', ') || 'None';

        sendLog(member.client, {
            title: `${theme.emojis.coffin} Member Left`,
            description: `**${member.user.tag}** has departed from the realm.`,
            color: theme.colors.accent,
            fields: [
                { name: `${theme.emojis.skull} User`, value: `${member.user} (${member.user.tag})`, inline: true },
                { name: `${theme.emojis.chain} Roles`, value: roles.slice(0, 1024), inline: false },
                { name: `${theme.emojis.bat} Member Count`, value: `${member.guild.memberCount}`, inline: true },
            ],
            thumbnail: member.user.displayAvatarURL({ size: 256 }),
        });

        const config = getConfig.get(member.guild.id);
        if (!config || !config.goodbye_channel_id) return;

        const channel = member.guild.channels.cache.get(config.goodbye_channel_id);
        if (!channel) return;

        const embed = createEmbed({
            title: `${theme.emojis.coffin} A soul has departed...`,
            thumbnail: theme.gifs.goodbye,
            description: [
                `**${member.user.username}** has faded into the abyss.`,
                '',
                `${theme.emojis.rose} Their shadow lingers no more.`,
                `${theme.divider}`,
                `${theme.emojis.skull} ${member.guild.memberCount} souls remain`,
            ].join('\n'),
            color: theme.colors.danger,
            thumbnail: member.user.displayAvatarURL({ size: 256 }),
        });

        channel.send({ embeds: [embed] }).catch(() => {});
    },
};
