import { MongoClient, Db } from 'mongodb';
import { getSecret } from 'astro:env/server';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
    const uri = getSecret("MONGODB_URI");
    if (!uri) {
        throw new Error("MONGODB_URI is not set in environment variables.");
    }

    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();

    const chatsCollection = db.collection('chats');
    await chatsCollection.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

    const usersCollection = db.collection('users');
    await usersCollection.createIndex({ username: 1 }, { unique: true });

    cachedClient = client;
    cachedDb = db;

    return { client, db };
}
