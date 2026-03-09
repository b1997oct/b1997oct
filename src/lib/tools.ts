/**
 * Shared tools and state for both Gemini Agent and MCP Server
 */
import profile from './profile_context.json';
import { getSecret } from 'astro:env/server';

export const toolHandlers = {
    get_profile_basic: async () => {
        console.log(`[Tools] Calling get_profile_basic`);
        return profile.basic;
    },

    get_profile_skills: async () => {
        console.log(`[Tools] Calling get_profile_skills`);
        return { skills: profile.skills };
    },

    get_profile_interests: async () => {
        console.log(`[Tools] Calling get_profile_interests`);
        return { interests: profile.interests };
    },

    get_profile_applications: async () => {
        console.log(`[Tools] Calling get_profile_applications`);
        return { applications: profile.applications };
    },

    get_profile_learning: async () => {
        console.log(`[Tools] Calling get_profile_learning`);
        return { learning: profile.learning };
    },

    get_profile_experience: async () => {
        console.log(`[Tools] Calling get_profile_experience`);
        return { experience: profile.experience };
    },

    get_profile_education: async () => {
        console.log(`[Tools] Calling get_profile_education`);
        return { education: profile.education };
    },

    send_slack_message: async ({ message }: { message: string }) => {
        console.log(`[Tools] Calling send_slack_message`);
        const webhookUrl = getSecret("SLACK_WEBHOOK_URL") || process.env.SLACK_WEBHOOK_URL;

        if (!webhookUrl) {
            return { success: false, error: "Feedback functionality is currently unavailable." };
        }

        try {
            const res = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: `New message from portfolio visitor:\n> ${message}` })
            });
            if (res.ok) {
                return { success: true, message: "Message sent to Bharath successfully!" };
            }
            return { success: false, error: await res.text() };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};
