/**
 * Shared tools and state for both Gemini Agent and MCP Server
 */
import profile from './profile_context.json';

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
    }
};
