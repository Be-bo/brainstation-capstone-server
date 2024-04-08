// MARK: Imports
const http = require('http');
const https = require('https');
const fs = require('fs');


// MARK: Functions
/**
 * Applies an execution delay for a specified number of milliseconds.
 * @param {number} ms - Number of milliseconds to resolve the promise after.
 * @returns {Promise} A promise that resolves after a specificed number of milliseconds.
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a text prompt for an OpenAI API DALL-E 3 image generation request.
 * @param {string} clothingProperties - A concatenated string of all color and clothing information (Eg. Blue V-Neck Sweater, Green Jeans, ...).
 * @returns {string} Finalized prompt that includes the passed in clothing properties as well a extra information for the model (prefix & suffix).
 */
function getPrompt(clothingProperties) {
  const promptPrefix = 'A male model figure curated with a fashionable sense of style. He is donned in:';
  const promptSuffix = '. All of this gives the figure a classy, reassuring, laidback look. The image is presented in a photo realistic style, capturing the essence of an elegant male figure.';
  return promptPrefix + clothingProperties + promptSuffix;
}

/**
 * Constructs and returns an object containing information for a single result of an image generation request.
 * @param {string} faceImage - A public folder URL pointing to the location of the face image on the server.
 * @param {string} faceImage - A public folder URL pointing to the location of the face image on the server.
 * @param {string} faceImage - A public folder URL pointing to the location of the face image on the server.
 * @param {number} timestamp - A Unix time timestamp for when the generation request object was created.
 * @param {string} authorId - An id of the user who initiated the generation request.
 * @param {Array} clothing - An array of objects where each item corresponds to a single clothing category, with the information of what the user selected (each contains the clothing category id, clothing id, and a color tuple).
 * @returns {Object} An object representing a single image generation request, ready to be saved to the MongoDB database.
 * @property {various} All properties inside of the return object correspond directly to the respective function parameters.
 */
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

/**
 * Saves a remote URL file to a local destitation.
 * @param {string} url - The URL of the target file.
 * @param {string} destinationPath - The local file system path for the remote file to be saved to.
 */
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


// MARK: Exports
module.exports = {
  constructGenerationItem,
  saveImageFromURL,
  getPrompt,
  delay
}