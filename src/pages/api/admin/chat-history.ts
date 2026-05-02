import type { APIRoute } from 'astro';
import { connectToDatabase } from '../../../lib/db';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
        return Response.json({ error: 'sessionId is required' }, { status: 400 });
    }

    try {
        const { db } = await connectToDatabase();
        const doc = await db.collection('chats').findOne({ sessionId });

        return Response.json({
            sessionId,
            messages: doc?.messages || [],
            expiresAt: doc?.expiresAt ?? null,
        });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};
