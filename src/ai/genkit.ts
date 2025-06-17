import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {config} from 'dotenv';

// Load environment variables from .env file
config();

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey && process.env.NODE_ENV !== 'production') {
  console.warn(
    'GOOGLE_API_KEY is not set in the environment. Genkit may rely on Application Default Credentials.'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey, // Use the API key from .env or environment
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
