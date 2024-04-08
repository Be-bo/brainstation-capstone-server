// MARK: Setup
const express = require('express');
const app = express();
const cors = require('cors');
const accountRoutes = require('./routes/account');
const playgroundRoutes = require('./routes/playground');
require('dotenv').config();
const {PORT} = process.env;
app.use(express.json());
app.use(cors());
app.use('/public', express.static('public'));


// MARK: Test Routes
app.get('/', (req, res) => {
    try{
        console.log('Client pang us: Hello World!');
        res.send('Server says: Hello World!');
    }catch(error){
        console.log('Hello world failed with: ', error);
        res.status(500).json({error});
    }
});


// MARK: Actual Routes
app.use(accountRoutes);
app.use(playgroundRoutes);


// MARK: Run Server
app.listen(PORT, ()=>console.log(`Server running on post ${PORT}`));