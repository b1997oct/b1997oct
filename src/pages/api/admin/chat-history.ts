import type { APIRoute } from 'astro';
import { connectToDatabase } from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
        return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    try {
        const { db } = await connectToDatabase();
        const chatDocs = await db.collection('chats')
            .find({ userId })
            .sort({ expiresAt: -1 })
            .toArray();

        const sessions = chatDocs.map((doc) => ({
            sessionId: doc.sessionId,
            messages: doc.messages || [],
            expiresAt: doc.expiresAt,
        }));

        return Response.json({ sessions });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};
