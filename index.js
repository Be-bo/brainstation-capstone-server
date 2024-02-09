// MARK: Setup
const express = require('express');
const app = express();
const cors = require('cors');
const {MongoClient} = require('mongodb');
const accountRoutes = require('./routes/account');
const playgroundRoutes = require('./routes/playground');
require('dotenv').config();
const {PORT} = process.env;
app.use(express.json());
app.use(cors());
app.use('/public', express.static('public'));


// MARK: MongoDB Testing
const url = 'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.1.1'; // Replace with your MongoDB server URL
const dbName = 'testDatabase'; // Replace with your database name
const client = new MongoClient(url, { useUnifiedTopology: true });

client.connect()
  .then(() => {
    console.log('Connected to MongoDB');
    const db = client.db(dbName);

    // You can perform database operations here

    // Example: Insert a document into a collection
    const collection = db.collection('users'); // Replace with your collection name
    const document = { name: 'John', age: 30 };
    return collection.insertOne(document);
  })
  .then((result) => {
    console.log('Inserted document:', result);
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  })
  .finally(() => {
    // Close the MongoDB client when done
    client.close();
  });




// MARK: Test Routes
app.get('/', (req, res) => {
    try{
        console.log('Hello World!');
        res.send('Hello World!');
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