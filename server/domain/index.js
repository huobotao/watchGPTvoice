const source = process.env.SOURCE || 'mock';

const client = source === 'domain'
  ? require('./realClient')
  : require('./mockClient');

module.exports = client;
