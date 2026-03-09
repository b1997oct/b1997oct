import type { APIRoute } from 'astro';
import { GroqAgent } from '../../lib/agent';
import { getSecret } from 'astro:env/server';

export const POST: APIRoute = async ({ request }) => {
    const { prompt } = await request.json();
    const apiKey = getSecret("GROQ_API_KEY");

    if (!apiKey) {
        return Response.json({
            response: "Error: GROQ_API_KEY is not set in environment variables."
        }, { status: 500 });
    }

    try {
        const agent = new GroqAgent(apiKey);
        const response = await agent.run(prompt);

        return Response.json({ response });
    } catch (error: any) {
        console.error("Agent Error:", error);
        return Response.json({
            response: `Error: ${error.message}`
        }, { status: 500 });
    }
};
