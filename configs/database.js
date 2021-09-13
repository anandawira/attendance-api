const mongoose = require('mongoose');

// Database connection
mongoose.connect(process.env.NODE_ENV === 'production' ? process.env.MONGO_DB_PROD : process.env.MONGO_DB_DEV, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

mongoose.connection.once('connected', ()=>{
  console.info.bind(console, 'MongoDB connected successfully')
})

mongoose.connection.on(
  'error',
  console.error.bind(console, 'MongoDB connection error'),
);
