const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = function loadCommands(client) {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(folderPath, file));
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                logger.info(`Loaded command: /${command.data.name}`);
            } else {
                logger.warn(`Command file ${folder}/${file} missing data or execute`);
            }
        }
    }

    logger.info(`Total commands loaded: ${client.commands.size}`);
};
