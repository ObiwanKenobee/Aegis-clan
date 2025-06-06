
import { config } from 'dotenv';
config();

import '@/ai/flows/offer-scriptural-guidance.ts';
import '@/ai/flows/suggest-resolution-paths.ts';
import '@/ai/flows/build-family-tree.ts';
import '@/ai/flows/log-rite-flow.ts';
import '@/ai/flows/interpret-moral-rules-flow.ts';
import '@/ai/flows/analyze-chat-history-flow.ts';
import '@/ai/flows/provide-language-context-flow.ts'; // Added new Language Context flow

// Cybersecurity Thematic Flows
import '@/ai/flows/detect-threats-flow.ts';
import '@/ai/flows/investigate-threat-flow.ts';
import '@/ai/flows/respond-to-threat-flow.ts';
