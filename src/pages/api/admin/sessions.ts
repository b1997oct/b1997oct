import type { APIRoute } from 'astro';
import { connectToDatabase } from '../../../lib/db';

export const GET: APIRoute = async () => {
    try {
        const { db } = await connectToDatabase();

        const chatDocs = await db.collection('chats')
            .find({})
            .sort({ expiresAt: -1 })
            .toArray();

        const sessions = chatDocs.map((doc) => {
            const expiresAt = doc.expiresAt instanceof Date ? doc.expiresAt : new Date(doc.expiresAt);
            const createdAt = new Date(expiresAt.getTime() - 24 * 60 * 60 * 1000);

            return {
                sessionId: doc.sessionId,
                messageCount: Array.isArray(doc.messages) ? doc.messages.length : 0,
                createdAt: createdAt.toISOString(),
                expiresAt: expiresAt.toISOString(),
            };
        });

        return Response.json({ sessions });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};
