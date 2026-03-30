import type { APIRoute } from 'astro';
import { connectToDatabase } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
    const body = await request.json();
    const { username, pin } = body;

    if (!username || typeof username !== 'string') {
        return Response.json({ error: 'Username is required' }, { status: 400 });
    }

    if (!pin || typeof pin !== 'string') {
        return Response.json({ error: 'PIN is required' }, { status: 400 });
    }

    try {
        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ username });

        if (!user) {
            return Response.json({ error: 'Invalid username or PIN' }, { status: 401 });
        }

        if (user.pin !== pin) {
            return Response.json({ error: 'Invalid username or PIN' }, { status: 401 });
        }

        const latestChat = await db.collection('chats')
            .findOne(
                { userId: user._id.toString() },
                { sort: { expiresAt: -1 } }
            );

        return Response.json({
            user: {
                _id: user._id.toString(),
                username: user.username,
                theme: user.theme,
                client_control: user.client_control,
            },
            sessionId: latestChat?.sessionId || null,
        });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};
