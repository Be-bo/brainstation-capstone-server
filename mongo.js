const { MongoClient, ObjectId } = require('mongodb');
const mongoUri = 'mongodb://localhost:27017/toga_database';

async function main() {
    const newAddress = 'http://3.130.188.16:80/';
    const oldAddress = 'http://3.20.237.64:80/';

    const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const targetCollection = client.db().collection('generated_items');

    const result = await targetCollection.updateMany(
        { target_image: { $exists: true } }, // Filter documents with the "image" field
        [
            { $set: { target_image: { $concat: [newAddress, { $substr: ['$target_image', 22, -1] }] } } }
        ]
    );

    console.log(result);
    await client.close();
}

main();