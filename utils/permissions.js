/**
 * Central role name/ID constants for permission checking.
 */
const BOT_OWNER_ID = process.env.BOT_OWNER_ID || '1011545451733975050';

function getMemberId(member) {
  return member?.id || member?.user?.id;
}

function isBotOwner(member) {
  return getMemberId(member) === BOT_OWNER_ID;
}

function matchRole(role, roleIdentifier) {
  if (!role || !roleIdentifier) return false;
  return role.id === roleIdentifier || role.name === roleIdentifier;
}

function hasRole(member, roleIdentifier) {
  if (!member || !roleIdentifier) return false;

  if (member.roles?.cache) {
    return member.roles.cache.some((role) => matchRole(role, roleIdentifier));
  }

  if (Array.isArray(member.roles)) {
    return member.roles.some((roleId) => roleId === roleIdentifier);
  }

  return false;
}

module.exports = {
  BOT_OWNER_ID,
  isBotOwner,
  hasRole,
  DEVELOPER_ROLE: process.env.DEVELOPER_ROLE || 'Developer',
  STAFF_ROLE: process.env.STAFF_ROLE || 'Staff',
  ADMIN_ROLE: process.env.ADMIN_ROLE || 'Admin',
  MOD_ROLE: process.env.MOD_ROLE || 'Moderator'
};
