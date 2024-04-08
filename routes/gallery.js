// MARK: Variables & Imports
const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const mongoUri = 'mongodb://localhost:27017/toga_database';


// MARK: Routes
router.get('/gallery', async (req, res) =>{
    try{
        const documents = await getGeneratedItems();
        return res.status(201).json(documents);
    }catch(e){
        console.error('Error; ', e);
        return res.status(500).send('Server failed to obtain and return generated items from the database.')
    }
});


// MARK: Processing Functions
async function getGeneratedItems(){
    const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const generatedItemsCollection = client.db().collection('generated_items');
    const generatedItems = await generatedItemsCollection.find({}).toArray();
    await client.close();
    return generatedItems;
}


// MARK: Export
module.exports = router;