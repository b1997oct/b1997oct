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
            description: "Get basic information about Bharath, including name, GitHub, tagline, email, phone, and professional summary.",
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
            description: "Get a detailed list of Bharath's skills, including languages, frameworks, databases, and tools.",
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
            description: "Get a list of Bharath's professional and technical interests.",
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
            description: "Get a list of applications and projects Bharath has built.",
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
            description: "Get information about what Bharath is currently learning or focusing on.",
            parameters: {
                type: "object",
                properties: {},
            },
        }
    },
    {
        type: "function",
        function: {
            name: "get_profile_experience",
            description: "Get a detailed list of Bharath's professional work experience, including roles, companies, and durations.",
            parameters: {
                type: "object",
                properties: {},
            },
        }
    },
    {
        type: "function",
        function: {
            name: "get_profile_education",
            description: "Get information about Bharath's education, degree, institution, and graduating year.",
            parameters: {
                type: "object",
                properties: {},
            },
        }
    },
    {
        type: "function",
        function: {
            name: "send_slack_message",
            description: "Use this tool to send a message or feedback from the user directly to Bharath via Slack. ALWAYS ask the user for their message first using text, and only call this tool when they provide the message.",
            parameters: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "The message or feedback the user wants to send to Bharath."
                    }
                },
                required: ["message"]
            },
        }
    },
];

/**
 * 3. The Agent Builder
 */
import profileData from "./profile_context.json";

export class GroqAgent {
    private groq: Groq;
    private model: string = "openai/gpt-oss-20b";
    private messages: any[] = [
        {
            role: "system",
            content: `You are Agent_1997, an AI assistant for ${profileData.basic.name}. Your sole purpose is to answer questions about ${profileData.basic.name} using the provided tools. You MUST ONLY answer questions related to ${profileData.basic.name}'s profile, skills, interests, applications, and learning based on the tool data. Do NOT answer any general knowledge questions or questions unrelated to ${profileData.basic.name}. If a user asks something unrelated, politely decline and state that you can only answer questions about ${profileData.basic.name}'s profile. Proactively ask users if they want to submit any feedback or messages to Bharath; if they say yes, capture their message and use the send_slack_message tool to send it to him. Keep your answers short, concise, and straight to the point.`
        }
    ];

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
