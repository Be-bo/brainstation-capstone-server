const http = require('http');
const https = require('https');
const fs = require('fs');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getPrompt(clothingProperties) {
  const promptCore = 'A male model figure curated with a fashionable sense of style. He is donned in:';
  const promptTail = '. All of this gives the figure a classy, reassuring, laidback look. The image is presented in a photo realistic style, capturing the essence of an elegant male figure.';
  return promptCore + clothingProperties + promptTail;
}

function constructGenerationItemName(reqBody) {
  const itemName = `${reqBody.top.color} ${reqBody.top.name} With a(n) ${reqBody.shirt.color} ${reqBody.shirt.name} and ${reqBody.bottom.color} ${reqBody.bottom.name}`; // adjust if needing to add extra categories & properties
  return itemName;
}

function constructGenerationItem(faceImage, targetImage, resultImage, timestamp, authorId, clothing) {
  const objectToSave = {
    'face_image': faceImage,
    'target_image': targetImage,
    'result_image': resultImage,
    'timestamp': timestamp,
    'author_id': authorId,
    'clothing': clothing
  };
  return objectToSave;
}

function saveItemToGenerationHistory(userId, itemToSave, historyJsonPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const stringifiedHistory = await fs.promises.readFile(historyJsonPath, 'utf-8');
      const parsedHistory = JSON.parse(stringifiedHistory);
      if (!parsedHistory.hasOwnProperty(userId)) parsedHistory[userId] = [];
      parsedHistory[userId].push(itemToSave);
      await fs.promises.writeFile(historyJsonPath, JSON.stringify(parsedHistory, null, 2));
      resolve();
    } catch (error) {
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
  saveImageFromURL,
  getPrompt,
  delay
}

//    colors: [[ 'Black', '#000000' ],[ 'White', '#FFFFFF' ],[ 'Grey', '#BCBCBC' ],[ 'Brown', '#A52A2A' ],[ 'Beige', '#F5F5DC' ],[ 'Navy', '#000080' ],[ 'Olive', '#808000' ],[ 'Burgundy', '#800020' ],[ 'Purple', '#800080' ],[ 'Pink', '#FFC0CB' ]]