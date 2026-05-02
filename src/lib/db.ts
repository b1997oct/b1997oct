import { MongoClient, Db } from 'mongodb';
import { getSecret } from 'astro:env/server';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let connecting: Promise<{ client: MongoClient; db: Db }> | null = null;

export async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    if (!connecting) {
        connecting = (async () => {
            const uri = getSecret("MONGODB_URI");
            if (!uri) {
                throw new Error("MONGODB_URI is not set in environment variables.");
            }

            const client = new MongoClient(uri, {
                tls: true,
                tlsAllowInvalidCertificates: false,
                serverSelectionTimeoutMS: 10_000,
                connectTimeoutMS: 10_000,
            });
            await client.connect();
            const db = client.db();

            const chatsCollection = db.collection('chats');
            await chatsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

            cachedClient = client;
            cachedDb = db;
            return { client, db };
        })().finally(() => {
            connecting = null;
        });
    }

    try {
        return await connecting;
    } catch (e) {
        cachedClient = null;
        cachedDb = null;
        throw e;
    }
}
