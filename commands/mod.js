const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MOD_ROLE, isBotOwner, hasRole } = require('../utils/permissions');
const { COLORS } = require('../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation commands grouped')
    .addSubcommand((s) => s.setName('ban').setDescription('Bannt einen Benutzer vom Server').addUserOption((o) => o.setName('user').setDescription('Benutzer, der gebannt werden soll').setRequired(true)).addStringOption((o) => o.setName('reason').setDescription('Grund für den Bann').setRequired(false)))
    .addSubcommand((s) => s.setName('kick').setDescription('Verbannt einen Benutzer vom Server').addUserOption((o) => o.setName('user').setDescription('Benutzer, der gekickt werden soll').setRequired(true)).addStringOption((o) => o.setName('reason').setDescription('Grund für den Kick').setRequired(false)))
    .addSubcommand((s) => s.setName('timeout').setDescription('Setzt eine Auszeit für einen Benutzer').addUserOption((o) => o.setName('user').setDescription('Benutzer, der eine Auszeit erhalten soll').setRequired(true)).addIntegerOption((o) => o.setName('duration').setDescription('Dauer in Sekunden').setRequired(true)).addStringOption((o) => o.setName('reason').setDescription('Grund für die Auszeit').setRequired(false)))
    .addSubcommand((s) => s.setName('warn').setDescription('Vergibt eine Verwarnung und protokolliert sie').addUserOption((o) => o.setName('user').setDescription('Benutzer, der verwarnt werden soll').setRequired(true)).addStringOption((o) => o.setName('reason').setDescription('Grund für die Verwarnung').setRequired(true)))
    .addSubcommand((s) => s.setName('warnings').setDescription('Zeigt Verwarnungen für einen Benutzer an').addUserOption((o) => o.setName('user').setDescription('Benutzer zum Anzeigen').setRequired(true))),

  async execute(interaction) {
    try {
      if (!isBotOwner(interaction.member) && !hasRole(interaction.member, MOD_ROLE)) {
        return await interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }

      const sub = interaction.options.getSubcommand();

      if (sub === 'ban') {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'Kein Grund angegeben';
        if (!target || !target.bannable) return await interaction.reply({ content: 'Ich kann diesen Benutzer nicht bannen.', ephemeral: true });
        await target.ban({ reason });
        return await interaction.reply({ content: `Der Benutzer ${target.user.tag} wurde erfolgreich gebannt.`, ephemeral: true });
      }

      if (sub === 'kick') {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'Kein Grund angegeben';
        if (!target || !target.kickable) return await interaction.reply({ content: 'Ich kann diesen Benutzer nicht kicken.', ephemeral: true });
        await target.kick(reason);
        return await interaction.reply({ content: `Der Benutzer ${target.user.tag} wurde erfolgreich gekickt.`, ephemeral: true });
      }

      if (sub === 'timeout') {
        const target = interaction.options.getMember('user');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'Kein Grund angegeben';
        if (!target || !target.moderatable) return await interaction.reply({ content: 'Ich kann diesen Benutzer nicht zeitlich sperren.', ephemeral: true });
        await target.timeout(duration * 1000, reason);
        return await interaction.reply({ content: `Der Benutzer ${target.user.tag} wurde für ${duration} Sekunden zeitlich gesperrt.`, ephemeral: true });
      }

      if (sub === 'warn') {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        interaction.client.warningStore.add(user.id, {
          moderator: interaction.user.tag,
          reason,
          timestamp: new Date().toISOString()
        });
        const embed = new EmbedBuilder().setTitle('Benutzer verwarnt').setColor(0xffd264).addFields({ name: 'Benutzer', value: `${user.tag} (${user.id})`, inline: false }, { name: 'Moderator', value: interaction.user.tag, inline: false }, { name: 'Grund', value: reason, inline: false }).setTimestamp();
        const logChannel = interaction.client.channels.cache.get(process.env.LOG_CHANNEL_ID);
        if (logChannel) await logChannel.send({ embeds: [embed] });
        await user.send({ content: `Du hast eine Verwarnung erhalten für: ${reason}` }).catch(() => null);
        return await interaction.reply({ content: `Der Benutzer ${user.tag} wurde erfolgreich verwarnt.`, ephemeral: true });
      }

      if (sub === 'warnings') {
        const user = interaction.options.getUser('user');
        const warnings = interaction.client.warningStore.get(user.id);
        if (!warnings.length) return await interaction.reply({ content: `${user.tag} hat keine Verwarnungen.`, ephemeral: true });
        const embed = new EmbedBuilder().setTitle(`Verwarnungen von ${user.tag}`).setColor(COLORS.warning).setTimestamp();
        warnings.slice(-5).forEach((warn, index) => {
          embed.addFields({ name: `Verwarnung ${warnings.length - index}`, value: `**Moderator:** ${warn.moderator}\n**Grund:** ${warn.reason}\n**Wann:** ${new Date(warn.timestamp).toLocaleString()}`, inline: false });
        });
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      return await interaction.reply({ content: 'Unbekannter Unterbefehl.', ephemeral: true });
    } catch (error) {
      console.error('Mod category command failed:', error);
      try { await interaction.reply({ content: 'Beim Ausführen des Moderationsbefehls ist ein Fehler aufgetreten.', ephemeral: true }); } catch (e) {}
    }
  }
};
