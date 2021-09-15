// Import environment variable from .env file except when on production server
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// NPM packages
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// Importing modules
const accountsRouter = require('./routes/accounts');
const authenticateAccessToken = require('./middleware/authenticateAccessToken');

// Importing swagger file
const swaggerDocument = YAML.load('./swagger.yaml');

// Initializing mongoDB
require('./configs/database');

// Initializing express instance
const app = express();

// Standard middleware
app.use(
  morgan(
    ':method :url :status :res[content-length] - :response-time[0] ms :user-agent'
  )
);
app.use(express.urlencoded({ extended: false }));
app.use(compression());
app.use(helmet());
app.use(cors());

// Routes
app.use('/v1/accounts', accountsRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/test-auth', authenticateAccessToken);

// error handler
app.use(function (err, req, res, next) {
  // render the error page
  res.status(err.status || 500).json({ message: err.message });
});

// Get port from environment variable or use 3000 on development
const port = process.env.PORT || 3000;

// Start listening on the port
app.listen(port, () => console.log(`Listening on port ${port}`));
