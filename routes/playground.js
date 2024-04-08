// MARK: Variables & Imports
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


// MARK: Multer Storage Setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'public', 'faces')); // save uploads to the 'public/faces' folder
    },
    filename: function (req, file, cb) {
        const uniqueFilename = uuidv4(); // generate a unique UUID for the filename
        const fileExtension = path.extname(file.originalname); // get the original file extension
        const newFilename = `${uniqueFilename}${fileExtension}`; // combine the UUID and file extension
        cb(null, newFilename); // pass the new filename to multer
    }
});
const upload = multer({ storage: storage, limits: { fieldSize: 10 * 1024 * 1024 } });


// MARK: REST Requests
/**
 * @route POST /playground/generate
 * @description Takes user's face image and their selection from the clothing carousels (clothing items and colors).
 * The route starts by preparing a prompt for DALL-E to generate an image with an outfit based on user's selection.
 * Once Open AI has returned a generated image the route passes it, along with the image of the face to Remaker.
 * Remaker swaps the face of the model inside of the DALL-E images with user's face.
 * That image gets saved and a new item for the generated item is consctructed, saved locally to Mongo, and returned to client.
 * @param {FormData} req.body.categories - The request body containing user clothing selection data.
 * @param {Blob} req.body.face_image - The face image file to overimpose onto the target image generated by DALL-E.
 * @throws {Error} - If something goes wrong during processing
 */
router.post('/playground/generate', upload.single('face_image'), async (req, res) => {

    // Prepare Client Input Data
    if (!req.file) return res.status(400).send('No face file uploaded.');
    const faceLocalFilePath = path.join(__dirname, '..', 'public', 'faces', req.file.filename);
    const faceImageUrl = helpers.facesServerUrlPath + req.file.filename;
    const clientCategoriesSelections = JSON.parse(req.body.categories);

    try {
        // Prepare prompt
        const clothingCategories = await getClothingCategoriesData();
        const clothingProperties = await combineClothingProperties(clothingCategories, clientCategoriesSelections);
        const prompt = helpers.getPrompt(clothingProperties);

        // OpenAI POST
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        const openaiResponse = await openai.images.generate({ model: "dall-e-3", prompt: prompt, n: 1, size: "1024x1024", }); // generation request properties
        const openaiImageName = uuidv4() + '.png';
        const openaiSavedImageUrl = helpers.targetsServerUrlPath + openaiImageName;
        const openaiSavedImagePath = await helpers.saveImageFromURL(openaiResponse.data[0].url, './public/targets/' + openaiImageName); // save locally, get path

        // Remaker POST
        const remakerPostUrl = 'https://developer.remaker.ai/api/remaker/v1/face-swap/create-job';
        const remakerHeaders = { 'accept': 'application/json', 'Authorization': REMAKER_API_KEY };
        const remakerFormData = await constructRemakerFormData(openaiSavedImagePath, faceLocalFilePath); // save face and DALL-E (target) images as blobs inside of a form data
        const remakerPostResponse = await axios.post(remakerPostUrl, remakerFormData, { headers: remakerHeaders });
        const remakerJobId = remakerPostResponse.data.result.job_id; // save Remaker's job ID assigned to our request

        // Remaker GET
        const remakerGetUrl = `https://developer.remaker.ai/api/remaker/v1/face-swap/${remakerJobId}`; // use the job ID in our get request for the face-swapped image
        helpers.delay(10000).then(async () => { // Remaker's servers seem to fail consistently when prompted right away
            const remakerGetResponse = await axios.get(remakerGetUrl, { headers: remakerHeaders });
            const remakerResultUrl = remakerGetResponse.data.result.output_image_url[0];
            const remakerImageName = uuidv4() + '.png';
            const remakerSavedImageUrl = helpers.resultsServerUrlPath + remakerImageName;
            await helpers.saveImageFromURL(remakerResultUrl, './public/results/' + remakerImageName); // save final result image locally
            const newGenerationItem = helpers.constructGenerationItem(faceImageUrl, openaiSavedImageUrl, remakerSavedImageUrl, Date.now(), 'test-author', clientCategoriesSelections); // save new item to Mongo
            if (!saveNewGenerationItem(saveNewGenerationItem)) return res.status(500).send('Failed to save the new image generation item to the server database.');
            return res.status(201).json(newGenerationItem);
        });

    } catch (error) {
        console.log('Failed to generate a new playground generation item: ', error);
        return res.status(500).json({ error });
    }
});


/**
 * @route POST /playground/clothing-categories
 * @description Gets and returns the "clothing_categories" collection from MongoDB (contains a list of base info for all clothing categories).
 * @param {express.Request} req - The request object.
 * @param {express.Response} res - The response object.
 * @returns {Promise<void>} The HTTP response indicating success or failure.
 * @throws {Error} - If something goes wrong during processing
 */
router.get('/playground/clothing-categories', async (req, res) => {
    try {
        const documents = await getClothingCategoriesData();
        return res.status(201).json(documents);
    } catch (e) {
        console.error('Error: ', e);
        return res.status(500).send('Server failed to get and return the data containing base information about all clothing categories.');
    }
});


/**
 * @route POST /playground/category
 * @description Based on the provided clothing category id a list of all clothing items within that category is returned to the client.
 * @param {express.Request} req - The request object.
 * @param {express.Response} res - The response object.
 * @returns {Promise<void>} The HTTP response indicating success or failure.
 * @throws {Error} - If something goes wrong during processing
 */
router.get('/playground/category', async (req, res) => {
    const categoryId = req.query.categoryId;
    if (!categoryId) return res.status(400).send('Missing or invalid categoryId parameter.');

    try {
        const categoryDocument = await getClothingCategoryData(categoryId);
        if (!categoryDocument) return res.status(404).send(`Category under the provided category id (${categoryId}) was not found in the database.`); // if the category doesn't exist
        const documents = await getClothingCategoryItems(categoryDocument['name'] + '_category')
        return res.status(201).json(documents);
    } catch (e) {
        console.error('Error: ', e);
        return res.status(500).send('Server failed to get items for the clothing category with id: ' + categoryId);
    }
});


// MARK: Specific Processing Functions
/**
 * Takes all category info and user selection from the client and constructs a single string containing the user's selection (to be used for Open AI prompting).
 * @param {Array} clothingCategories - A list of all clothing category base data items.
 * @param {Array} clientCategoriesSelections - A list of user selections, each item has a category id, a clothing item id, and a color tuple.
 * @returns {string} A combination of all color and clothing item names separated by commas (Eg. Blue V-Neck T-Shirt, Blue Jeans, etc.).
 */
async function combineClothingProperties(clothingCategories, clientCategoriesSelections) {
    const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    let clothingProperties = '';
    for (let i = 0; i < clientCategoriesSelections.length; i++) {
        const categoryDocument = await clothingCategories.findOne({ _id: ObjectId(clientCategoriesSelections[i]['category_id']) }); // need category names first to know which collection to target
        const categoryCollectionName = categoryDocument['name'] + '_category';
        const categoryCollection = client.db().collection(categoryCollectionName);
        const clothingItem = await categoryCollection.findOne({ _id: ObjectId(clientCategoriesSelections[i]['selected_clothing_id']) }); // locate clothing item name in the appropriate collection based on its id
        const colorName = clientCategoriesSelections[i]['selected_color'][0];
        clothingProperties += ' ' + colorName + ' ' + clothingItem.name + ',';
    }
    await client.close();
    return clothingProperties;
}

/**
 * Takes the user's face image and the DALL-E generated image of an outfit, and encodes them as BLOBs inside of a FormData variable to be submitted to Remaker (for face swapping).
 * @param {string} openaiSavedImagePath - Local server path to where the target (DALL-E generated) image is stored.
 * @param {string} faceLocalFilePath - Local server path to where the user's face image is stored.
 * @returns {FormData} A form containing the target image and the face (swap) image encoded as BLOBs, for Remaker to process.
 */
async function constructRemakerFormData(openaiSavedImagePath, faceLocalFilePath) {
    let remakerFormData = new FormData();
    const targetImage = fs.readFileSync(openaiSavedImagePath); // sync read of locally saved images
    const swapImage = fs.readFileSync(faceLocalFilePath);
    remakerFormData.append('target_image', new Blob([targetImage])); // save as BLOBs
    remakerFormData.append('swap_image', new Blob([swapImage]));
    return remakerFormData;
}

/**
 * Takes an object representing a single image generation item and saves it to the appropriate MongoDB collection.
 * @param {Object} newGenerationItem 
 * @returns {boolean} True if saving to the generated_items collection succeeded, false if it failed.
 */
async function saveNewGenerationItem(newGenerationItem) {
    const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const generatedItemsCollection = client.db().collection('generated_items');
    const result = await generatedItemsCollection.insertOne(newGenerationItem);
    await client.close();
    if (result && result.insertedCount === 1) return true;
    else return false;
}

/**
 * Connects to MongoDB client and obtains all documents from the "clothing_categories" collection, returning them as an array.
 * @returns {Array} A list of objects where each item contains base data about a particular clothing category.
 */
async function getClothingCategoriesData() {
    const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const categoriesCollection = client.db().collection('clothing_categories');
    const categoryDocuments = await categoriesCollection.find({}).toArray();
    await client.close();
    return categoryDocuments;
}

/**
 * Connects to MongoDB client and obtains a single clothing category base data based on the provided category id.
 * @param {string} categoryId - The string id of the returned category.
 * @returns {Object} A single document from the "clothing_categories" collection containing all base information about the given clothing category.
 */
async function getClothingCategoryData(categoryId) {
    const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const categoriesCollection = client.db().collection('clothing_categories');
    const categoryDocument = await categoriesCollection.findOne({ _id: ObjectId(categoryId) });
    await client.close();
    return categoryDocument;
}

/**
 * Connects to MongoDB client and obtains all individual clothing item data for a single (provided name) clothing category.
 * @param {string} categoryCollectionName - Clothing category string name.
 * @returns {Array} A list of all clothing item objects from a particular clothing category.
 */
async function getClothingCategoryItems(categoryCollectionName) {
    const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const categoryCollection = client.db().collection(categoryCollectionName);
    const documents = await categoryCollection.find({}).toArray();
    await client.close();
    return documents;
}


// MARK: Export
module.exports = router;