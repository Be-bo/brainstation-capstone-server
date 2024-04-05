// MARK: Setup
const express = require('express');
const router = express.Router();
const OpenAI = require("openai");
const helpers = require('../helpers');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const { OPENAI_API_KEY } = process.env;
const { REMAKER_API_KEY } = process.env;
const { MongoClient, ObjectId } = require('mongodb');
const mongoUri = 'mongodb://localhost:27017/toga_database';

// Set up multer to handle file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'public', 'faces')); // Save uploads to the 'public/faces' folder
    },
    filename: function (req, file, cb) {
        const uniqueFilename = uuidv4(); // Generate a unique UUID for the filename
        const fileExtension = path.extname(file.originalname); // Get the original file extension
        const newFilename = `${uniqueFilename}${fileExtension}`; // Combine the UUID and file extension
        cb(null, newFilename); // Pass the new filename to multer
    }
});
const upload = multer({ storage: storage, limits: { fieldSize: 10 * 1024 * 1024 } });


// MARK: Create a Generation Item
// http://3.20.237.64:80/playground/generate -- UBUNTU SERVER
// http://3.145.198.110:80/playground/generate -- AWS LINUX SERVER
router.post('/playground/generate', upload.single('face_image'), async (req, res) => {

    // incoming face image
    if (!req.file) return res.status(400).send('No file uploaded');
    // const filename = req.file.filename;
    const faceFilePath = path.join(__dirname, '..', 'public', 'faces', req.file.filename);

    try {

        // get clothing and color info using incoming ids from client
        const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        const categoriesObject = JSON.parse(req.body.categories);
        const categoriesCollection = client.db().collection('clothing_categories');
        let clothingProperties = '';
        for (let i = 0; i < categoriesObject.length; i++) {
            const categoryDocument = await categoriesCollection.findOne({ _id: ObjectId(categoriesObject[i]['category_id']) });
            const categoryCollectionName = categoryDocument['name'] + '_category';
            const categoryCollection = client.db().collection(categoryCollectionName);
            const clothingItem = await categoryCollection.findOne({ _id: ObjectId(categoriesObject[i]['selected_clothing_id']) });
            const colorName = categoriesObject[i]['selected_color'][0];
            clothingProperties += ' ' + colorName + ' ' + clothingItem.name + ',';
        }
    
        // Open AI API
        const prompt = helpers.getPrompt(clothingProperties);
        console.log(prompt);
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        const openaiResponse = await openai.images.generate({ model: "dall-e-3", prompt: prompt, n: 1, size: "1024x1024", });
        console.log('Successfully processed a generation request, OpenAI response: ', openaiResponse);
        const openaiImageId = uuidv4();
        const openaiImageName = openaiImageId + '.png';
        const openaiSavedImageUrl = 'http://3.20.237.64:80/public/targets/' + openaiImageName;
        console.log(openaiSavedImageUrl);
        const openaiSavedImagePath = await helpers.saveImageFromURL(openaiResponse.data[0].url, './public/targets/' + openaiImageName);
    
        // Remaker Face Swap Post
        const remakerPostUrl = 'https://developer.remaker.ai/api/remaker/v1/face-swap/create-job';
        const remakerHeaders = {
            'accept': 'application/json',
            'Authorization': REMAKER_API_KEY,
        };
        const remakerFormData = new FormData();
        const targetImage = fs.readFileSync(openaiSavedImagePath);
        const swapImage = fs.readFileSync(faceFilePath);
        remakerFormData.append('target_image', new Blob([targetImage]));
        remakerFormData.append('swap_image', new Blob([swapImage]));
        const remakerPostResponse = await axios.post(remakerPostUrl, remakerFormData, { headers: remakerHeaders });
        console.log(remakerPostResponse.data);
        const remakerJobId = remakerPostResponse.data.result.job_id;
        console.log(remakerJobId);
    
        // Remaker Face Swap Get
        const remakerGetUrl = `https://developer.remaker.ai/api/remaker/v1/face-swap/${remakerJobId}`;
        helpers.delay(10000).then(async ()=>{
            const remakerGetResponse = await axios.get(remakerGetUrl, { headers: remakerHeaders });
            console.log(remakerGetResponse.data); // Print the response content
            const remakerResultUrl = remakerGetResponse.data.result.output_image_url[0];
            console.log(remakerResultUrl);
        
            const remakerImageId = uuidv4();
            const remakerImageName = remakerImageId + '.png';
            const remakerSavedImageUrl = 'http://3.20.237.64:80/public/results/' + remakerImageName;
            console.log(remakerSavedImageUrl);
            const remakerSavedImagePath = await helpers.saveImageFromURL(remakerResultUrl, './public/results/' + remakerImageName);
            console.log('remaker image saved successfully: ', remakerSavedImagePath);
        });

        console.log('finished try code block');

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