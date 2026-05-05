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
    {
        type: "function",
        function: {
            name: "get_best_friends",
            description: "Get a list of Bharath's best friends.",
            parameters: {
                type: "object",
                properties: {},
            },
        }
    },
    {
        type: "function",
        function: {
            name: "toggle_website_theme",
            description:
                "Switch the site between light and dark (the only two themes). Use immediately when the request is vague: e.g. change theme, switch theme, toggle theme, flip appearance, suggestion 'Change theme'. Do NOT ask the user which theme—they only have toggle or explicit requests.",
            parameters: {
                type: "object",
                properties: {},
            },
        }
    },
    {
        type: "function",
        function: {
            name: "change_website_theme",
            description:
                "Set the site to light or dark explicitly. Use ONLY when the user clearly names one: e.g. 'switch to light', 'use dark mode', 'make it light'. If they are vague, use toggle_website_theme instead. You MUST call the tool; do not change theme with text alone.",
            parameters: {
                type: "object",
                properties: {
                    theme: {
                        type: "string",
                        enum: ["light", "dark"],
                        description: "Either light or dark.",
                    }
                },
                required: ["theme"]
            },
        }
    },
    {
        type: "function",
        function: {
            name: "clear_chat",
            description: "CRITICAL: Use this tool to open the clear chat confirmation modal when the user asks to clear, reset, or delete the chat history.",
            parameters: {
                type: "object",
                properties: {},
            },
        }
    }
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
            content: `You are Agent_B7, an AI assistant for ${profileData.basic.name}. Your sole purpose is to answer questions about ${profileData.basic.name} using the provided tools. You MUST ONLY answer questions related to ${profileData.basic.name}'s profile, skills, interests, applications, learning, and best friends based on the tool data.

If the user asks identity/capability questions such as "who are you", "what can you do", or "how can you help", respond with this exact first sentence:
"I am an AI Assistant for Bharath Nethra."
Then add 3-5 concise suggested actions as bullets. Include this suggestion wording exactly as one bullet:
"Send message to Barath via Slack (99% delivery rate)"

For contact information (email, phone, LinkedIn, GitHub, etc.), you MUST use the 'get_profile_basic' tool and provide the details found there as clickable Markdown links where applicable. Do NOT say you can only answer profile questions when asked for contact info, as contact info is part of the profile.

If a user asks how to contact or message Bharath, you can provide his email/phone from 'get_profile_basic' AND proactively ask if they want to send him a direct message via Slack. If they say yes, capture their message and use the 'send_slack_message' tool.

IMPORTANT — theme (light/dark only): NEVER ask "which theme" or offering choices. Generic requests ('change theme', 'toggle theme', suggestion chip, etc.) → call 'toggle_website_theme' immediately. Explicit requests naming one mode ('dark mode', 'switch to light', 'make it dark') → call 'change_website_theme' with light or dark. You MUST execute a tool each time—text alone cannot change the theme. After any theme tool succeeds, say the theme was **changed** in one short sentence. Do not use the word toggled.

IMPORTANT: If the user asks to clear, reset, or delete the chat history, you MUST call the 'clear_chat' tool.

ALWAYS use Markdown for your responses (e.g., [Name](URL) for links, **bold** for emphasis, lists for multiple items) to ensure the UI renders them beautifully. 

When listing multiple items (like skills, experience, or tools), ALWAYS use a vertical bulleted list (one item per line) instead of a table or a comma-separated string. This ensures the information is clear and readable on all devices. For example:
### Category Name
- Item 1
- Item 2

Do NOT answer any general knowledge questions or questions unrelated to ${profileData.basic.name}. For unrelated questions, politely decline and then offer 2-3 relevant suggested actions about ${profileData.basic.name}'s profile/contact options (including Slack messaging when appropriate). Keep your answers short, concise, and straight to the point.`
        }
    ];

    constructor(apiKey: string) {
        if (!apiKey) throw new Error("Groq API Key is required.");
        this.groq = new Groq({ apiKey });
    }

    async run(prompt: string, history: any[] = []): Promise<{ content: string; clientActions: any[] }> {
        const clientActions: any[] = [];
        // Prepend history if provided, but after the system message
        if (history.length > 0) {
            this.messages = [this.messages[0], ...history];
        }

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

                    if (functionName === 'toggle_website_theme') {
                        clientActions.push({ type: 'TOGGLE_THEME' });
                        return {
                            tool_call_id: toolCall.id,
                            role: "tool",
                            name: functionName,
                            content: JSON.stringify({
                                success: true,
                                message: "The theme was changed. Reply in one short sentence; say the theme was changed. Do not use the word toggled.",
                            }),
                        };
                    }

                    if (functionName === 'change_website_theme') {
                        clientActions.push({ type: 'CHANGE_THEME', payload: functionArgs.theme });
                        return {
                            tool_call_id: toolCall.id,
                            role: "tool",
                            name: functionName,
                            content: JSON.stringify({
                                success: true,
                                message: `The theme was changed to ${functionArgs.theme}. Reply briefly; say the theme was changed. Do not use the word toggled.`,
                            }),
                        };
                    }

                    if (functionName === 'clear_chat') {
                        clientActions.push({ type: 'CLEAR_CHAT' });
                        return {
                            tool_call_id: toolCall.id,
                            role: "tool",
                            name: functionName,
                            content: JSON.stringify({ success: true, message: `Clear chat confirmation modal opened successfully. Inform the user.` }),
                        };
                    }

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

        return { content: responseMessage.content || "", clientActions };
    }
}
