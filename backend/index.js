const express = require('express');
const app=express();
const bodyParser = require('body-parser');
require ('dotenv').config();
require('./model/db');
const cors = require('cors');
const authRouter = require('./routes/authRouter');

const PORT = process.env.PORT ||5000;


app.use(bodyParser.json());
app.use(cors());
app.use('/auth',authRouter);

app.get('/root',(req,res)=>{
    res.send('Hello world from root route');
});


app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})
