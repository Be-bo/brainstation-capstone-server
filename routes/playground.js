// MARK: Setup
const express = require('express');
const router = express.Router();
const OpenAI = require("openai");
const helpers = require('../helpers');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const { OPENAI_API_KEY } = process.env;
const historyJsonPath = 'generationHistory.json';
const { MongoClient, ObjectId } = require('mongodb');
const mongoUri = 'mongodb://localhost:27017/toga_database';

// Set up multer to handle file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public', 'faces')); // Save uploads to the 'public/faces' folder
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Keep the original file name
    }
});
const upload = multer({ storage: storage, limits: {fieldSize: 10 * 1024 * 1024} });


// MARK: Create a Generation Item
// http://3.20.237.64:80/playground/generate -- UBUNTU SERVER
// http://3.145.198.110:80/playground/generate -- AWS LINUX SERVER
router.post('/playground/generate', upload.single('face_image'), async (req, res) => {

    // Handle file upload
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }
    res.status(200).send('File uploaded successfully');


    try {
        // const prompt = helpers.constructPrompt(req.body);
        // console.log('Starting generation with prompt: ', prompt);
        // const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        // const response = await openai.images.generate({ model: "dall-e-3", prompt: prompt, n: 1, size: "1024x1024", });
        // console.log('Successfully processed a generation request, OpenAI response: ', response);

        // const itemId = uuidv4();
        // const imageName = itemId + '.png';
        // console.log(imageName);
        // const savedImageUrl = 'http://3.145.198.110:80/public/' + imageName;
        // console.log(savedImageUrl);
        // const savedImagePath = await helpers.saveImageFromURL(response.data[0].url, '../public/'+imageName);
        // console.log('img saved successfully: ', savedImagePath);

        // const newGenerationItem = helpers.constructGenerationItem(req.body, [savedImageUrl], itemId);
        // await helpers.saveItemToGenerationHistory(req.body.userId, newGenerationItem, historyJsonPath);
        // console.log('Successfully saved item to local json: ', newGenerationItem);
        // res.status(201).json(newGenerationItem);

    } catch (error) {
        console.log('Failed to create a new playground generation item: ', error);
        res.status(500).json({ error });
    }
});



// MARK: Get Base Information For All Clothing Categories
router.get('/playground/clothing-categories', async (req, res) => {
    try {
        const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();

        const categoriesCollection = client.db().collection('clothing_categories');
        const documents = await categoriesCollection.find({}).toArray();

        await client.close();
        res.status(201).json(documents);

    } catch (e) {
        console.error('Error: ', e);
        res.status(500).send('Server failed to get clothing categories collection.');
    }
});


// MARK: Get All Items of a Specific Clothing Category
router.get('/playground/category', async (req, res) => {
    const categoryId = req.query.categoryId;

    try {
        const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();

        const categoriesCollection = client.db().collection('clothing_categories');
        const categoryDocument = await categoriesCollection.findOne({ _id: ObjectId(categoryId) });

        const categoryCollectionName = categoryDocument['name'] + '_category';
        const categoryCollection = client.db().collection(categoryCollectionName);
        const documents = await categoryCollection.find({}).toArray();

        await client.close();
        res.status(201).json(documents);

    } catch (e) {
        console.error('Error: ', e);
        res.status(500).send('Server failed to get items for category with id: ' + categoryId);
    }
});

module.exports = router;