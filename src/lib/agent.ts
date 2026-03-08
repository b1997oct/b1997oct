import { GoogleGenerativeAI, SchemaType, type Tool } from "@google/generative-ai";
import { toolHandlers } from "./tools";

/**
 * 1. Define the Tools
 * These are functions the AI agent can choose to call to get real-world data.
 * Updated to focus on Barath's profile data.
 */
const tools: Tool[] = [
    {
        functionDeclarations: [
            {
                name: "get_profile_basic",
                description: "Get basic information about Barath, including name, GitHub, tagline, email, and vision.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {},
                },
            },
            {
                name: "get_profile_skills",
                description: "Get a detailed list of Barath's skills, including AI, ML, Agents, Prompt Engineering, and Databases.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {},
                },
            },
            {
                name: "get_profile_interests",
                description: "Get a list of Barath's professional and technical interests.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {},
                },
            },
            {
                name: "get_profile_applications",
                description: "Get a list of applications and projects Barath has built.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {},
                },
            },
            {
                name: "get_profile_learning",
                description: "Get information about what Barath is currently learning or focusing on.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {},
                },
            }
        ],
    },
];

/**
 * 3. The Agent Builder
 */
export class GoogleAgent {
    private model: any;
    private chat: any;

    constructor(apiKey: string) {
        if (!apiKey) throw new Error("Google AI API Key is required.");

        const genAI = new GoogleGenerativeAI(apiKey);

        // Initialize the model with the updated profile tools
        this.model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-lite",
            tools: tools
        });

        // Start a chat session to maintain context
        this.chat = this.model.startChat();
    }

    async run(prompt: string): Promise<string> {
        // Count and log tokens before sending the user prompt
        const tokenCount = await this.model.countTokens(prompt);
        console.log(`[Token Usage] Sending prompt. Tokens: ${tokenCount.totalTokens}`);

        // Send the user prompt
        let result = await this.chat.sendMessage(prompt);
        let response = result.response;

        // Process potential function calls (can be multiple)
        let functionCalls = response.candidates[0].content.parts.filter(
            (part: any) => part.functionCall
        );

        // If the model wants to call tools, we execute them and send results back
        while (functionCalls.length > 0) {
            console.log(`[Agent] Model requested ${functionCalls.length} function calls.`);

            const functionResponses = await Promise.all(
                functionCalls.map(async (part: any) => {
                    const call = part.functionCall;
                    const handler = (toolHandlers as any)[call.name];

                    if (!handler) {
                        return {
                            functionResponse: {
                                name: call.name,
                                response: { error: `Tool ${call.name} not found` },
                            },
                        };
                    }

                    const toolResult = await handler(call.args);
                    return {
                        functionResponse: {
                            name: call.name,
                            response: toolResult,
                        },
                    };
                })
            );

            // Count and log tokens before sending tool responses
            const toolTokenCount = await this.model.countTokens(functionResponses);
            console.log(`[Token Usage] Sending tool responses. Tokens: ${toolTokenCount.totalTokens}`);

            // Send the tool results back to the model to get the final natural language answer
            result = await this.chat.sendMessage(functionResponses);
            response = result.response;

            // Check if the model needs to call more tools
            functionCalls = response.candidates[0].content.parts.filter(
                (part: any) => part.functionCall
            );
        }

        return response.text();
    }
}
