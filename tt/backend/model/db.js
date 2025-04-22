const mongoose =require('mongoose');

require('dotenv').config();

const mongo_URL = process.env.DB_URL;

mongoose.connect(mongo_URL)
.then(() => {
    console.log('MongoDB connected successfully');
}).catch((error) => {
    console.error('MongoDB connection failed:', error.message);
})


