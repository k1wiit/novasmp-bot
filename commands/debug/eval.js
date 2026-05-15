const { SlashCommandBuilder } = require('discord.js');
const { DEVELOPER_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Führe JavaScript-Code aus (nur Entwickler)')
    .addStringOption((option) =>
      option.setName('code').setDescription('JavaScript-Code zum Ausführen').setRequired(true)
    ),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, DEVELOPER_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const code = interaction.options.getString('code');
      let result;
      try {
        // WARNING: eval is dangerous. Use only in trusted environments.
        result = eval(code);
      } catch (execError) {
        return interaction.reply({ content: `Auswertungsfehler: ${execError.message}`, ephemeral: true });
      }

      await interaction.reply({ content: `Ergebnis: \`${typeof result}\`\n\`${String(result).slice(0, 1900)}\``, ephemeral: true });
    } catch (error) {
      console.error('Eval command failed:', error);
      await interaction.reply({ content: 'Der Code konnte nicht ausgewertet werden.', ephemeral: true });
    }
  }
};
