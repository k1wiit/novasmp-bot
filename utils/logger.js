const timestamp = () => new Date().toISOString();

function info(message, meta = '') {
  console.log(`[INFO]  ${timestamp()} - ${message}${meta ? ` | ${meta}` : ''}`);
}

function warn(message, meta = '') {
  console.warn(`[WARN]  ${timestamp()} - ${message}${meta ? ` | ${meta}` : ''}`);
}

function error(message, meta = '') {
  console.error(`[ERROR] ${timestamp()} - ${message}${meta ? ` | ${meta}` : ''}`);
}

module.exports = {
  info,
  warn,
  error
};
