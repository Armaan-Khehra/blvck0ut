require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));
        if ('data' in command) {
            commands.push(command.data.toJSON());
        }
    }
}

const rest = new REST().setToken(config.token);

(async () => {
    try {
        console.log(`Registering ${commands.length} slash commands...`);

        // Guild-scoped for instant updates during development
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );

        console.log(`Successfully registered ${commands.length} commands.`);
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
})();
