// MARK: Variables & Imports
const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const mongoUri = 'mongodb://localhost:27017/toga_database';


// MARK: Routes
/**
 * @route GET /gallery
 * @description Obtains all of the generated items to date from Mongo and returns them in the form of an object array to the client.
 * @param {express.Request} req - The request object.
 * @param {express.Response} res - The response object.
 * @returns {Promise} The HTTP response indicating success or failure.
 * @throws {Error} - If something goes wrong during processing.
 */
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
/**
 * Connects to local MongoDB instance and obtains all generated items to date & returns them.
 * @returns {Array} A list of all documents from the generated_items collection.
 */
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