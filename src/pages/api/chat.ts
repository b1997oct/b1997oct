import type { APIRoute } from 'astro';
import { GroqAgent } from '../../lib/agent';
import { getSecret } from 'astro:env/server';
import { connectToDatabase } from '../../lib/db';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
        return Response.json({ messages: [] });
    }

    try {
        const { db } = await connectToDatabase();
        const chatHistory = await db.collection('chats').findOne({ sessionId });
        return Response.json({
            messages: chatHistory?.messages || []
        });
    } catch (error: any) {
        console.error("Fetch History Error:", error);
        return Response.json({ messages: [], error: error.message }, { status: 500 });
    }
};

export const POST: APIRoute = async ({ request }) => {
    const { prompt, sessionId, saveOnly, messages } = await request.json();

    if (saveOnly && sessionId && messages) {
        try {
            const { db } = await connectToDatabase();
            await db.collection('chats').updateOne(
                { sessionId },
                {
                    $set: {
                        messages: messages,
                        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                    }
                },
                { upsert: true }
            );
            return Response.json({ ok: true });
        } catch (err) {
            console.error("Save History Error:", err);
            return Response.json({ ok: false }, { status: 500 });
        }
    }

    const apiKey = getSecret("GROQ_API_KEY");

    if (!apiKey) {
        return Response.json({
            response: "Error: GROQ_API_KEY is not set in environment variables."
        }, { status: 500 });
    }

    try {
        let historyMessages: any[] = [];
        let db: any = null;

        // Try to connect to DB and fetch history if sessionId is provided
        if (sessionId) {
            try {
                const conn = await connectToDatabase();
                db = conn.db;
                const chatHistory = await db.collection('chats').findOne({ sessionId });
                if (chatHistory && chatHistory.messages) {
                    historyMessages = chatHistory.messages;
                }
            } catch (dbErr) {
                console.error("Database connection error, proceeding without history:", dbErr);
            }
        }

        const agent = new GroqAgent(apiKey);
        const { content: response, clientActions } = await agent.run(prompt, historyMessages);

        // Save updated history back to MongoDB if sessionId is active
        if (sessionId && db) {
            try {
                // Combine history with new user prompt and assistant response
                const updatedMessages = [
                    ...historyMessages,
                    { role: "user", content: prompt },
                    { role: "assistant", content: response }
                ];

                await db.collection('chats').updateOne(
                    { sessionId },
                    {
                        $set: {
                            messages: updatedMessages,
                            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                        }
                    },
                    { upsert: true }
                );
            } catch (saveErr) {
                console.error("Failed to save chat history:", saveErr);
            }
        }

        return Response.json({ response, clientActions });
    } catch (error: any) {
        console.error("Agent Error:", error);
        return Response.json({
            response: `Error: ${error.message}`
        }, { status: 500 });
    }
};
