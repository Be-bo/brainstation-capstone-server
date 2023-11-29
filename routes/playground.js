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
        const newGenerationItem = helpers.constructGenerationItem(req.body, [response.data[0].url], uuidv4());
        await helpers.saveItemToGenerationHistory(req.body.userId, newGenerationItem, historyJsonPath);
        console.log('Successfully saved item to local json: ', newGenerationItem);
        res.status(201).json(newGenerationItem);

    } catch (error) {
        console.log('Failed to create a new playground generation item: ', error);
        res.status(500).json({ error });
    }
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