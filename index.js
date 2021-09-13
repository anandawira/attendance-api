// Import environment variable from .env file except when on production server
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// NPM packages
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const compression = require('compression');
const helmet = require("helmet");

// Initializing mongoDB
require('./configs/database')

// Initializing express instance
const app = express()

// Standard middleware
app.use(
  morgan(
    ':method :url :status :res[content-length] - :response-time[0] ms :user-agent',
  ),
);
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(compression());
app.use(helmet());

// Get port from environment variable or use 3000 on development
const port = process.env.PORT || 3000;

// Start listening on the port
app.listen(port, () => console.log(`Listening on port ${port}`));

