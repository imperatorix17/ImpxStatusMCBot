const { REST, Routes } = require('discord.js');
const fs = require('fs');

/**
 * Registra automaticamente tutti i comandi slash su Discord
 * @param {string} clientId - L'Application ID del bot
 * @param {string} token - Il token del bot
 * @param {string} guildId - (Opzionale) Guild ID per registrazione immediata
 */
async function registerCommands(clientId, token, guildId = null) {
    const commands = [];

    
    if (!fs.existsSync('./commands')) {
        console.log('⚠️ Cartella commands non trovata. Nessun comando da registrare.');
        return false;
    }

    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    if (commandFiles.length === 0) {
        console.log('⚠️ Nessun comando trovato nella cartella commands.');
        return false;
    }

    
    for (const file of commandFiles) {
        try {
            
            delete require.cache[require.resolve(`./commands/${file}`)];
            
            const command = require(`./commands/${file}`);
            
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                console.log(`✅ Caricato comando: ${command.data.name}`);
            } else {
                console.log(`⚠️ Il comando "${file}" manca della proprietà "data" o "execute".`);
            }
        } catch (error) {
            console.error(`❌ Errore caricando comando ${file}:`, error.message);
        }
    }

    if (commands.length === 0) {
        console.log('⚠️ Nessun comando valido da registrare.');
        return false;
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(`\n🔄 Registrazione automatica di ${commands.length} slash command(s)...`);

        
        if (guildId) {
            const guildData = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
            console.log(`✅ ${guildData.length} comandi registrati sul server di test (disponibili subito)!`);
        } else {
            
            const data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
            console.log(`✅ ${data.length} comandi registrati GLOBALMENTE!`);
            console.log('⏳ I comandi globali possono richiedere fino a 1 ora per apparire.\n');
        }

        return true;

    } catch (error) {
        console.error('❌ Errore durante la registrazione dei comandi:', error);
        
        if (error.code === 10002) {
            console.error('💡 Controlla che il clientId nel config.json sia corretto!');
        }
        
        return false;
    }
}

module.exports = { registerCommands };

