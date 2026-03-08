import type { APIRoute } from 'astro';
import { GoogleAgent } from '../../lib/agent';
import { getSecret } from 'astro:env/server';

export const POST: APIRoute = async ({ request }) => {
    const { prompt } = await request.json();
    const apiKey = getSecret("GOOGLE_API_KEY");

    // IMPORTANT: The user must have GOOGLE_API_KEY in their environment


    if (!apiKey) {
        return Response.json({
            response: "Error: GOOGLE_API_KEY is not set in environment variables."
        }, { status: 500 });
    }

    try {
        const agent = new GoogleAgent(apiKey);
        const response = await agent.run(prompt);

        return Response.json({ response });
    } catch (error: any) {
        console.error("Agent Error:", error);
        return Response.json({
            response: `Error: ${error.message}`
        }, { status: 500 });
    }
};
