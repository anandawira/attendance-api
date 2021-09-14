const redis = require('redis');
const { promisify } = require('util');

const client = redis.createClient(process.env.REDIS_URL);

client.on('error', (error) => {
  console.error(error);
});

const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);

module.exports = { client, getAsync, setAsync };
