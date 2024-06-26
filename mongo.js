const { MongoClient, ObjectId } = require('mongodb');
const mongoUri = 'mongodb://localhost:27017/toga_database';

async function main() {
    const newAddress = 'http://3.130.188.16:80/';
    const oldAddress = 'http://3.20.237.64:80/';

    const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const targetCollection = client.db().collection('generated_items');

    const result = await targetCollection.updateMany(
        { result_image: { $exists: true } }, // Filter documents with the "image" field
        [
            { $set: { result_image: { $concat: [newAddress, { $substr: ['$result_image', 22, -1] }] } } }
        ]
    );

    console.log(result);
    await client.close();
}

main();


// 'http://3.130.188.16:80/public/button-up.png'
// 'http://3.130.188.16:80/public/crew-tee.png'
// 'http://3.130.188.16:80/public/henley.png'
// 'http://3.130.188.16:80/public/polo.png'
// 'http://3.130.188.16:80/public/v-neck-tee.png'
// {$set: {image: "your_new_image_value_here"}}