const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

async function createWelcomeCard(user, memberCount) {
  const width = 1000;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, 0, height / 2, height);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Sans';
  ctx.fillText('Willkommen auf dem Server', 520, 120);
  ctx.font = 'bold 64px Sans';
  ctx.fillText(user.username, 520, 210);

  ctx.font = '28px Sans';
  ctx.fillText(`Mitglied #${memberCount}`, 520, 280);
  ctx.fillText('Schön, dass du dabei bist!', 520, 340);

  const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 512 }));
  ctx.save();
  ctx.beginPath();
  ctx.arc(220, height / 2, 170, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 40, 90, 360, 360);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeCard };
