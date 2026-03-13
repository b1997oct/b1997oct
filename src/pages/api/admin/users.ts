import type { APIRoute } from 'astro';
import { connectToDatabase } from '../../../lib/db';

export const GET: APIRoute = async () => {
    try {
        const { db } = await connectToDatabase();

        const users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray();

        const usersWithStats = await Promise.all(
            users.map(async (u) => {
                const chatDocs = await db.collection('chats').find({ userId: u._id.toString() }).toArray();
                const messageCount = chatDocs.reduce((sum, doc) => sum + (doc.messages?.length || 0), 0);

                return {
                    _id: u._id.toString(),
                    username: u.username,
                    theme: u.theme,
                    client_control: u.client_control,
                    createdAt: u.createdAt,
                    messageCount,
                };
            })
        );

        return Response.json({ users: usersWithStats });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};
