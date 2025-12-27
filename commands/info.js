const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Mostra le informazioni del server Minecraft'),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 }); 

        try {
            const apiUrl = config.serverType === "bedrock" 
                ? `https://api.mcsrvstat.us/bedrock/3/${config.serverIP}:${config.serverPort}`
                : `https://api.mcsrvstat.us/3/${config.serverIP}:${config.serverPort}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!data.online) {
                throw new Error('Server offline');
            }

            let serverDisplay;
            if (config.serverType === "bedrock") {
                serverDisplay = `\`${config.serverIP}:${config.serverPort}\``;
            } else {
                serverDisplay = config.serverPort === 25565 
                    ? `\`${config.serverIP}\`` 
                    : `\`${config.serverIP}:${config.serverPort}\``;
            }

            const embed = new EmbedBuilder()
                .setTitle('ℹ️ Informazioni Server Minecraft')
                .setDescription(`🌍 **IP Server:** ${serverDisplay}\n\u200B`)
                .setColor(0x5865F2)
                .setThumbnail(`https://api.mcsrvstat.us/icon/${config.serverIP}`);

            if (data.version) {
                embed.addFields({ 
                    name: '📝 Versione', 
                    value: data.version || 'Sconosciuta', 
                    inline: true 
                });
            }

            embed.addFields({ 
                name: '🎮 Tipo', 
                value: config.serverType === "bedrock" ? "Bedrock Edition" : "Java Edition", 
                inline: true 
            });

            embed.addFields({ 
                name: '\u200B', 
                value: '', 
                inline: false 
            });

            let motdText = "Nessun MOTD disponibile";
            if (data.motd && data.motd.clean && data.motd.clean.length > 0) {
                motdText = data.motd.clean.join('\n');
            } else if (data.motd && data.motd.raw && data.motd.raw.length > 0) {
                motdText = data.motd.raw.join('\n');
            }
            
            if (motdText.length > 1024) {
                motdText = motdText.substring(0, 1020) + "...";
            }
            
            embed.addFields({ 
                name: '📢 MOTD', 
                value: motdText, 
                inline: false 
            });

            if (config.serverType === "java" && data.software) {
                embed.addFields({ 
                    name: '⚙️ Software', 
                    value: data.software, 
                    inline: true 
                });
            }

            if (data.hostname) {
                embed.addFields({ 
                    name: '🔗 Hostname', 
                    value: `\`${data.hostname}\``, 
                    inline: true 
                });
            }

            embed
                .setFooter({ 
                    text: 'Richiesto da ' + interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Errore comando /info-mc:', error.message);

            let serverDisplay;
            if (config.serverType === "bedrock") {
                serverDisplay = `\`${config.serverIP}:${config.serverPort}\``;
            } else {
                serverDisplay = config.serverPort === 25565 
                    ? `\`${config.serverIP}\`` 
                    : `\`${config.serverIP}:${config.serverPort}\``;
            }

            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Impossibile Recuperare Informazioni')
                .setDescription(`🚫 Non è stato possibile ottenere le informazioni del server ${serverDisplay}.`)
                .addFields({
                    name: '🔍 Possibili cause',
                    value: '• Il server è offline\n• Il server sta riavviando\n• Informazioni non disponibili',
                    inline: false
                })
                .setColor(0xFF0000)
                .setFooter({ 
                    text: 'Richiesto da ' + interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
