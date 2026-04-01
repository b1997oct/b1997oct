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
            name: "change_website_theme",
            description: "CRITICAL: You MUST call this tool EVERY TIME the user requests to change the theme. Do not just reply with text.",
            parameters: {
                type: "object",
                properties: {
                    theme: {
                        type: "string",
                        enum: ["light", "dark", "system"],
                        description: "The requested theme."
                    }
                },
                required: ["theme"]
            },
        }
    },
    {
        type: "function",
        function: {
            name: "open_edit_profile",
            description: "CRITICAL: Use this tool to open the edit profile modal when the user asks to change or edit their Username, Pin, or Profile.",
            parameters: {
                type: "object",
                properties: {},
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
    },
    {
        type: "function",
        function: {
            name: "open_link",
            description: "CRITICAL: Use this tool to navigate or open a link when requested. For external links (e.g. LinkedIn, GitHub), set new_tab to true. For internal routes (e.g. /dashboard), set new_tab to false.",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "The URL or path to open." },
                    new_tab: { type: "boolean", description: "True to open in a new tab, false to navigate in the current tab." }
                },
                required: ["url", "new_tab"],
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
            content: `You are Agent_1997, an AI assistant for ${profileData.basic.name}. Your sole purpose is to answer questions about ${profileData.basic.name} using the provided tools. You MUST ONLY answer questions related to ${profileData.basic.name}'s profile, skills, interests, applications, learning, and best friends based on the tool data. 

For contact information (email, phone, LinkedIn, GitHub, etc.), you MUST use the 'get_profile_basic' tool and provide the details found there as clickable Markdown links where applicable. Do NOT say you can only answer profile questions when asked for contact info, as contact info is part of the profile.

If a user asks how to contact or message Bharath, you can provide his email/phone from 'get_profile_basic' AND proactively ask if they want to send him a direct message via Slack. If they say yes, capture their message and use the 'send_slack_message' tool.

IMPORTANT: If the user asks to change the website theme, you MUST call the 'change_website_theme' tool EVERY SINGLE TIME, even if you did it in a previous message. You cannot change the theme just by replying with text. YOU MUST EXECUTE THE TOOL.

IMPORTANT: If the user asks to change or edit their Username, Pin, or Profile, you MUST call the 'open_edit_profile' tool.

IMPORTANT: If the user asks to clear, reset, or delete the chat history, you MUST call the 'clear_chat' tool.

IMPORTANT: If the user asks to open a link, navigate to a dashboard, view LinkedIn, etc., you MUST call the 'open_link' tool.

ALWAYS use Markdown for your responses (e.g., [Name](URL) for links, **bold** for emphasis, lists for multiple items) to ensure the UI renders them beautifully. 

When listing multiple items (like skills, experience, or tools), ALWAYS use a vertical bulleted list (one item per line) instead of a table or a comma-separated string. This ensures the information is clear and readable on all devices. For example:
### Category Name
- Item 1
- Item 2

Do NOT answer any general knowledge questions or questions unrelated to ${profileData.basic.name}. If a user asks something completely unrelated, politely decline. Keep your answers short, concise, and straight to the point.`
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

                    if (functionName === 'change_website_theme') {
                        clientActions.push({ type: 'CHANGE_THEME', payload: functionArgs.theme });
                        return {
                            tool_call_id: toolCall.id,
                            role: "tool",
                            name: functionName,
                            content: JSON.stringify({ success: true, message: `Theme changed to ${functionArgs.theme}. Inform the user.` }),
                        };
                    }

                    if (functionName === 'open_edit_profile') {
                        clientActions.push({ type: 'OPEN_EDIT_PROFILE' });
                        return {
                            tool_call_id: toolCall.id,
                            role: "tool",
                            name: functionName,
                            content: JSON.stringify({ success: true, message: `Edit profile modal opened successfully. Inform the user.` }),
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

                    if (functionName === 'open_link') {
                        clientActions.push({ type: 'OPEN_LINK', payload: { url: functionArgs.url, new_tab: functionArgs.new_tab } });
                        return {
                            tool_call_id: toolCall.id,
                            role: "tool",
                            name: functionName,
                            content: JSON.stringify({ success: true, message: `Navigated to ${functionArgs.url} successfully. Inform the user.` }),
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
