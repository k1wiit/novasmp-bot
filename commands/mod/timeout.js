const { SlashCommandBuilder } = require('discord.js');
const { MOD_ROLE, isBotOwner, hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Setzt eine Auszeit für einen Benutzer')
    .addUserOption((option) => option.setName('user').setDescription('Benutzer, der eine Auszeit erhalten soll').setRequired(true))
    .addIntegerOption((option) => option.setName('duration').setDescription('Dauer in Sekunden').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Grund für die Auszeit').setRequired(false)),
  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, MOD_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const target = interaction.options.getMember('user');
      const duration = interaction.options.getInteger('duration');
      const reason = interaction.options.getString('reason') || 'Kein Grund angegeben';
      if (!target || !target.moderatable) {
        return await interaction.reply({ content: 'Ich kann diesen Benutzer nicht zeitlich sperren.', ephemeral: true });
      }

      await target.timeout(duration * 1000, reason);
      await interaction.reply({ content: `Der Benutzer ${target.user.tag} wurde für ${duration} Sekunden zeitlich gesperrt.`, ephemeral: true });
    } catch (error) {
      console.error('Timeout command failed:', error);
      await interaction.reply({ content: 'Der Benutzer konnte nicht zeitlich gesperrt werden.', ephemeral: true });
    }
  }
};
