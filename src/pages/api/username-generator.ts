import type { APIRoute } from 'astro';
import { connectToDatabase } from '../../lib/db';

const adjectives = [
    'Neon', 'Cyber', 'Quantum', 'Stellar', 'Cosmic', 'Nova', 'Pixel', 'Shadow',
    'Crystal', 'Thunder', 'Blazing', 'Frozen', 'Golden', 'Silver', 'Iron',
    'Electric', 'Sonic', 'Turbo', 'Hyper', 'Ultra', 'Mega', 'Atomic', 'Solar',
    'Lunar', 'Astral', 'Mystic', 'Swift', 'Silent', 'Brave', 'Bold', 'Vivid',
    'Radiant', 'Crimson', 'Azure', 'Emerald', 'Amber', 'Violet', 'Obsidian',
];

const nouns = [
    'Pioneer', 'Voyager', 'Falcon', 'Phoenix', 'Titan', 'Nexus', 'Cipher',
    'Spark', 'Pulse', 'Drift', 'Blaze', 'Storm', 'Wolf', 'Raven', 'Hawk',
    'Fox', 'Lynx', 'Sage', 'Knight', 'Ranger', 'Pilot', 'Scout', 'Apex',
    'Vortex', 'Echo', 'Zenith', 'Atlas', 'Orbit', 'Prism', 'Flare', 'Comet',
    'Nebula', 'Striker', 'Phantom', 'Glider', 'Breaker', 'Crest', 'Dusk',
];

function generateUsername(): string {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}_${noun}_${num}`;
}

export const GET: APIRoute = async () => {
    try {
        const { db } = await connectToDatabase();
        const usersCollection = db.collection('users');

        let username = generateUsername();
        let attempts = 0;

        while (attempts < 10) {
            const existing = await usersCollection.findOne({ username });
            if (!existing) break;
            username = generateUsername();
            attempts++;
        }

        return Response.json({ username });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};
