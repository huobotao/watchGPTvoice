const settings = require('../settings');

const mock = require('./mockClient');
const real = require('./realClient');

// Resolve per-call so the SOURCE can be flipped from the Settings UI without
// restarting the server.
function pick() {
  return settings.getSource() === 'domain' ? real : mock;
}

module.exports = {
  get kind() {
    return pick().kind;
  },
  search: (params) => pick().search(params),
  getById: (id) => pick().getById(id),
};
