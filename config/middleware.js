module.exports = {
  //...
  settings: {
    cors: {
      enabled: false,
      origin: ['http://great.greenfieldsdairy.com','http://localhost:3000','*'], //allow all origins
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], //allow all methods
      headers: ["*"], //allow all headers
      credentials: true, //allow credentials
    },
  },
};
