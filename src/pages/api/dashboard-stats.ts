import type { APIRoute } from 'astro';
import { connectToDatabase } from '../../lib/db';

export const GET: APIRoute = async () => {
    try {
        const { db } = await connectToDatabase();

        const totalUsers = await db.collection('users').countDocuments();
        const totalChats = await db.collection('chats').countDocuments();

        const totalMessages = await db.collection('chats').aggregate([
            { $project: { messageCount: { $size: { $ifNull: ['$messages', []] } } } },
            { $group: { _id: null, total: { $sum: '$messageCount' } } },
        ]).toArray();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayChats = await db.collection('chats').countDocuments({
            expiresAt: { $gte: todayStart }
        });

        return Response.json({
            totalUsers,
            totalChats,
            totalMessages: totalMessages[0]?.total || 0,
            todayChats,
        });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};
