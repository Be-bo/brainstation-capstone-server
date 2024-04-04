// MARK: Setup
const express = require('express');
const router = express.Router();
const OpenAI = require("openai");
const fs = require('fs');
const helpers = require('../helpers');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const {OPENAI_API_KEY} = process.env;
const topLayerJsonPath = 'topLayer.json';
const shirtLayerJsonPath = 'shirtLayer.json';
const bottomLayerJsonPath = 'bottomLayer.json';
const historyJsonPath = 'generationHistory.json';

const {MongoClient} = require('mongodb');
const mongoUri = 'mongodb://localhost:27017/toga_database';


// MARK: Create a Generation Item
// http://3.20.237.64:80/playground/generate -- UBUNTU SERVER
// http://3.145.198.110:80/playground/generate -- AWS LINUX SERVER
router.post('/playground/generate', async (req, res) => {
    try {
        const prompt = helpers.constructPrompt(req.body);
        console.log('Starting generation with prompt: ', prompt);
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        const response = await openai.images.generate({ model: "dall-e-3", prompt: prompt, n: 1, size: "1024x1024", });
        console.log('Successfully processed a generation request, OpenAI response: ', response);

        const itemId = uuidv4();
        const imageName = itemId + '.png';
        console.log(imageName);
        const savedImageUrl = 'http://3.145.198.110:80/public/' + imageName;
        console.log(savedImageUrl);
        const savedImagePath = await helpers.saveImageFromURL(response.data[0].url, '../public/'+imageName);
        console.log('img saved successfully: ', savedImagePath);

        const newGenerationItem = helpers.constructGenerationItem(req.body, [savedImageUrl], itemId);
        await helpers.saveItemToGenerationHistory(req.body.userId, newGenerationItem, historyJsonPath);
        console.log('Successfully saved item to local json: ', newGenerationItem);
        res.status(201).json(newGenerationItem);

    } catch (error) {
        console.log('Failed to create a new playground generation item: ', error);
        res.status(500).json({ error });
    }
});



// MARK: Get Base Information For All Clothing Categories
router.get('/playground/clothing-categories', async(req,res) => {
    try{
        const client = new MongoClient(mongoUri, {useNewUrlParser: true, useUnifiedTopology: true});
        await client.connect();

        const categoriesCollection = client.db().collection('clothing_categories');
        const documents = await categoriesCollection.find({}).toArray();

        await client.close();

        console.log(documents);
    }
});


// MARK: Get All Items For a Specific Category
router.get('/playground/category', async(req, res) =>{

});



// MARK: Get Top Layer Carousel
router.get('/playground/top-layer', async (req, res) => {
    try {
        const topLayerJson = await fs.promises.readFile(topLayerJsonPath, 'utf-8');
        const parsedTopLayer = JSON.parse(topLayerJson);
        console.log('Successfully returned a list of top layer clothing.');
        res.status(200).json(parsedTopLayer);
    } catch (error) {
        console.log('Cannot return a list of top layer clothing: ', error);
        res.status(500).json({ error });
    }
});


// MARK: Get Shirt Layer Carousel
router.get('/playground/shirt-layer', async (req, res) => {
    try {
        const shirtLayerJson = await fs.promises.readFile(shirtLayerJsonPath, 'utf-8');
        const parsedShirtLayer = JSON.parse(shirtLayerJson);
        console.log('Successfully returned a list of shirt layer clothing.');
        res.status(200).json(parsedShirtLayer);
    } catch (error) {
        console.log('Cannot return a list of shirt layer clothing: ', error);
        res.status(500).json({ error });
    }
});


// MARK: Get Bottom Layer Carousel
router.get('/playground/bottom-layer', async (req, res) => {
    try {
        const bottomLayerJson = await fs.promises.readFile(bottomLayerJsonPath, 'utf-8');
        const parsedBottomLayer = JSON.parse(bottomLayerJson);
        console.log('Successfully returned a list of bottom layer clothing.');
        res.status(200).json(parsedBottomLayer);
    } catch (error) {
        console.log('Cannot return a list of shirt layer clothing: ', error);
        res.status(500).json({ error });
    }
});


module.exports = router;