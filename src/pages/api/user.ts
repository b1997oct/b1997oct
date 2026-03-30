import type { APIRoute } from 'astro';
import { connectToDatabase } from '../../lib/db';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
        return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    try {
        const { db } = await connectToDatabase();
        const { ObjectId } = await import('mongodb');
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return Response.json({ user: null });
        }

        return Response.json({
            user: {
                _id: user._id.toString(),
                username: user.username,
                theme: user.theme,
                client_control: user.client_control,
                createdAt: user.createdAt,
            }
        });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};

export const PATCH: APIRoute = async ({ request }) => {
    const body = await request.json();
    const { userId, username, theme, client_control, pin } = body;

    if (!userId) {
        return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    if (username !== undefined) {
        if (typeof username !== 'string' || !username.trim()) {
            return Response.json({ error: 'Invalid username' }, { status: 400 });
        }
        if (/\s/.test(username)) {
            return Response.json({ error: 'Username must not contain spaces' }, { status: 400 });
        }
    }

    try {
        const { db } = await connectToDatabase();
        const { ObjectId } = await import('mongodb');
        const usersCollection = db.collection('users');

        if (username !== undefined) {
            const existing = await usersCollection.findOne({
                username,
                _id: { $ne: new ObjectId(userId) },
            });
            if (existing) {
                return Response.json({ error: 'Username already taken' }, { status: 409 });
            }
        }

        const updateFields: Record<string, any> = {};
        if (username !== undefined) updateFields.username = username;
        if (theme !== undefined) updateFields.theme = theme;
        if (client_control !== undefined) updateFields.client_control = client_control;
        if (pin !== undefined) {
            if (typeof pin !== 'string' || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
                return Response.json({ error: 'PIN must be 4-8 digits' }, { status: 400 });
            }
            updateFields.pin = pin;
        }

        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: updateFields }
        );

        const updated = await usersCollection.findOne({ _id: new ObjectId(userId) });

        return Response.json({
            user: {
                _id: updated!._id.toString(),
                username: updated!.username,
                theme: updated!.theme,
                client_control: updated!.client_control,
            }
        });
    } catch (error: any) {
        if (error.code === 11000) {
            return Response.json({ error: 'Username already taken' }, { status: 409 });
        }
        return Response.json({ error: error.message }, { status: 500 });
    }
};

export const POST: APIRoute = async ({ request }) => {
    const body = await request.json();
    const { username, theme, client_control, pin } = body;

    if (!username || typeof username !== 'string') {
        return Response.json({ error: 'username is required' }, { status: 400 });
    }

    if (/\s/.test(username)) {
        return Response.json({ error: 'Username must not contain spaces' }, { status: 400 });
    }

    if (!pin || typeof pin !== 'string' || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
        return Response.json({ error: 'PIN must be 4-8 digits' }, { status: 400 });
    }

    try {
        const { db } = await connectToDatabase();
        const usersCollection = db.collection('users');

        const existing = await usersCollection.findOne({ username });
        if (existing) {
            return Response.json({ error: 'Username already taken' }, { status: 409 });
        }

        const result = await usersCollection.insertOne({
            username,
            pin,
            theme: theme || 'system',
            client_control: client_control ?? true,
            createdAt: new Date(),
        });

        return Response.json({
            user: {
                _id: result.insertedId.toString(),
                username,
                theme: theme || 'system',
                client_control: client_control ?? true,
            }
        }, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            return Response.json({ error: 'Username already taken' }, { status: 409 });
        }
        return Response.json({ error: error.message }, { status: 500 });
    }
};
