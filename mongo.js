const { MongoClient, ObjectId } = require('mongodb');
const mongoUri = 'mongodb://localhost:27017/toga_database';

async function main() {
    const newAddress = 'http://3.130.188.16:80/';
    const oldAddress = 'http://3.20.237.64:80/';

    const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const targetCollection = client.db().collection('top_category');

    const result = await targetCollection.updateMany(
        { image: { $exists: true } }, // Filter documents with the "image" field
        [
            { $set: { image: { $concat: [newAddress, { $substr: ['$image', 22, -1] }] } } }
        ]
    );

    console.log(result);
    await client.close();
}

main();