import Groq from "groq-sdk";
import { toolHandlers } from "./tools";

/**
 * 1. Define the Tools in OpenAI format
 * These are functions the AI agent can choose to call to get real-world data.
 */
const tools: any[] = [
    {
        type: "function",
        function: {
            name: "get_profile_basic",
            description: "Get basic information about Barath, including name, GitHub, tagline, email, and vision.",
            parameters: {
                type: "object",
                properties: {},
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_profile_skills",
            description: "Get a detailed list of Barath's skills, including AI, ML, Agents, Prompt Engineering, and Databases.",
            parameters: {
                type: "object",
                properties: {},
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_profile_interests",
            description: "Get a list of Barath's professional and technical interests.",
            parameters: {
                type: "object",
                properties: {},
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_profile_applications",
            description: "Get a list of applications and projects Barath has built.",
            parameters: {
                type: "object",
                properties: {},
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_profile_learning",
            description: "Get information about what Barath is currently learning or focusing on.",
            parameters: {
                type: "object",
                properties: {},
            },
        }
    },
];

/**
 * 3. The Agent Builder
 */
export class GroqAgent {
    private groq: Groq;
    private model: string = "openai/gpt-oss-20b";
    private messages: any[] = [];

    constructor(apiKey: string) {
        if (!apiKey) throw new Error("Groq API Key is required.");
        this.groq = new Groq({ apiKey });
    }

    async run(prompt: string): Promise<string> {
        this.messages.push({ role: "user", content: prompt });

        let response = await this.groq.chat.completions.create({
            model: this.model,
            messages: this.messages,
            tools: tools,
            tool_choice: "auto",
        });

        let responseMessage = response.choices[0].message;
        this.messages.push(responseMessage);

        // Process potential tool calls
        while (responseMessage.tool_calls) {
            console.log(`[Agent] Model requested ${responseMessage.tool_calls.length} tool calls.`);

            const toolOutputs = await Promise.all(
                responseMessage.tool_calls.map(async (toolCall: any) => {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);
                    const handler = (toolHandlers as any)[functionName];

                    if (!handler) {
                        return {
                            tool_call_id: toolCall.id,
                            role: "tool",
                            name: functionName,
                            content: JSON.stringify({ error: `Tool ${functionName} not found` }),
                        };
                    }

                    const toolResult = await handler(functionArgs);
                    return {
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: JSON.stringify(toolResult),
                    };
                })
            );

            this.messages.push(...toolOutputs);

            // Send tool outputs back to Groq
            response = await this.groq.chat.completions.create({
                model: this.model,
                messages: this.messages,
                tools: tools,
            });

            responseMessage = response.choices[0].message;
            this.messages.push(responseMessage);
        }

        return responseMessage.content || "";
    }
}
