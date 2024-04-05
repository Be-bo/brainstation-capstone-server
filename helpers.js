const http = require('http');
const https = require('https');
const fs = require('fs');

function constructPrompt(reqBody){
    const promptCore = `A male model figure curated with a fashionable sense of style. It is donned in a ${reqBody.top.color} ${reqBody.top.name} that complements his ${reqBody.shirt.color} ${reqBody.shirt.name}. His ${reqBody.bottom.color} ${reqBody.bottom.name} add an extra flare to its outfit.`
    // in between here we can add additional sentences with extra clothing categories & their properties
    const promptTail = ' All of this gives the figure a classy, reassuring, laidback look. The image is presented in a photo realistic style, capturing the essence of an elegant male figure.'
    return promptCore + promptTail;
}

function constructGenerationItemName(reqBody){
    const itemName = `${reqBody.top.color} ${reqBody.top.name} With a(n) ${reqBody.shirt.color} ${reqBody.shirt.name} and ${reqBody.bottom.color} ${reqBody.bottom.name}`; // adjust if needing to add extra categories & properties
    return itemName;
}

function constructGenerationItem(reqBody, imageUrlArray, itemId){
    const objectToSave = {
        'id': itemId,
        'name': constructGenerationItemName(reqBody),
        'images': imageUrlArray,
        'shirt': reqBody.shirt,
        'top': reqBody.top,
        'bottom': reqBody.bottom
        // here we can add extra clothing accessories & their properties in the same fashion as above
    };
    return objectToSave;
}

function saveItemToGenerationHistory(userId, itemToSave, historyJsonPath){
    return new Promise(async (resolve, reject) => {
        try{
            const stringifiedHistory = await fs.promises.readFile(historyJsonPath, 'utf-8');
            const parsedHistory = JSON.parse(stringifiedHistory);
            if(!parsedHistory.hasOwnProperty(userId)) parsedHistory[userId] = [];
            parsedHistory[userId].push(itemToSave);
            await fs.promises.writeFile(historyJsonPath, JSON.stringify(parsedHistory, null, 2));
            resolve();
        }catch(error){
            console.log('Failed saving generation item to history: ', error);
            reject(error);
        }
    });
}

async function saveImageFromURL(url, destinationPath) {
    const protocol = url.startsWith('https') ? https : http;
  
    return new Promise((resolve, reject) => {
      protocol.get(url, response => {
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.startsWith('image')) {
          reject(new Error('The provided URL is not an image'));
        }
  
        const fileStream = fs.createWriteStream(destinationPath);
        response.pipe(fileStream);
  
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(destinationPath);
        });
  
        fileStream.on('error', err => {
          reject(err);
        });
      }).on('error', err => {
        reject(err);
      });
    });
  }

module.exports = {
    constructPrompt,
    constructGenerationItem,
    constructGenerationItemName,
    saveItemToGenerationHistory,
    saveImageFromURL
}

//    colors: [[ 'Black', '#000000' ],[ 'White', '#FFFFFF' ],[ 'Grey', '#BCBCBC' ],[ 'Brown', '#A52A2A' ],[ 'Beige', '#F5F5DC' ],[ 'Navy', '#000080' ],[ 'Olive', '#808000' ],[ 'Burgundy', '#800020' ],[ 'Purple', '#800080' ],[ 'Pink', '#FFC0CB' ]]