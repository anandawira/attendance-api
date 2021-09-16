const jwt = require('jsonwebtoken');
const Account = require('../models/account');

module.exports = [
  // Authentication using access token
  async (req, res, next) => {
    // Extract access token from header
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];

    // Check if token exist
    if (accessToken === undefined) {
      // if not exist, send response to client
      return res
        .status(401)
        .json({ message: `'Authorization' header not found.` });
    }

    try {
      // Verify access token
      const account = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

      // Destructure account data from account object
      const { id, isAdmin } = account;

      // Add account data to the request object
      req.account = { id, isAdmin };

      // Continue to next middleware
      return next();
    } catch (err) {
      // Check if error is because the access token is expired
      if (!err.expiredAt) {
        // If not expired then token invalid. Send response to client
        return res.status(401).json({ message: 'Invalid access token.' });
      }

      // If token expired then call next middleware
      req.isRefreshNeeded = true;
      return next();
    }
  },
  // Refreshing access token using refresh token
  async (req, res, next) => {
    // Check if request need to be refreshed
    if (!req.isRefreshNeeded) {
      // If refresh not needed then continue to next middleware
      return next();
    }

    const refreshToken = req.get('refresh_token');

    // Check if the refresh token exist inside the headers
    if (refreshToken === undefined) {
      return res.status(401).json({
        message:
          'Access token expired. Refresh token not found inside the headers.',
      });
    }

    try {
      // Check if refresh token is valid
      const refreshAccount = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );

      // Get the id from refresh token
      const { id } = refreshAccount;

      // Retrieve the latest account data from database
      const account = await Account.findById(id, 'isAdmin').lean();

      // Check if id exist
      if (!account) {
        // If not found, send response to client
        return res
          .status(410)
          .json({ message: 'Account is no longer exist in the database.' });
      }

      // Destructuring properties from account object
      const { _id, isAdmin } = account;

      // Generate a new access token
      const accessToken = await jwt.sign(
        { id: _id, isAdmin: isAdmin },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1d' }
      );

      // Append new access token to response headers
      res.append('new_access_token', accessToken);

      // Append account data to request object
      req.account = { id: _id, isAdmin };

      // Continue to next middleware
      return next();
    } catch (err) {
      // if error, send response to client
      return res.status(401).json({
        message: 'Access token expired. refreshing access token failed',
      });
    }
  },
  (req, res, next) => {
    return next();
    // return res.json({ account: req.account });
  },
];
