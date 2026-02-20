const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ManaLedger API',
      version: '1.0.0',
      description: 'API for syncing and managing CardMarket data',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'CardMarket',
        description: 'CardMarket sync operations',
      },
      {
        name: 'Card',
        description: 'Card data endpoints',
      },
    ],
  },
  apis: ['./index.js', './routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
