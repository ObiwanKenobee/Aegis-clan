
'use server';
/**
 * @fileOverview A Genkit flow for providing context about language diversity and endangerment.
 *
 * - provideLanguageContext - A function that takes a topic and returns AI-generated information.
 * - LanguageContextInput - The input type for the provideLanguageContext function.
 * - LanguageContextOutput - The return type for the provideLanguageContext function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const LanguageContextInputSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters.').describe('A specific question or topic related to language diversity, endangerment, or Ethnologue (e.g., "Tell me about endangered languages", "What is Ethnologue?").'),
  clanLanguageContext: z.string().optional().describe('Optional: Specific context about a clan\'s language or concerns to help tailor the response.'),
});
export type LanguageContextInput = z.infer<typeof LanguageContextInputSchema>;

export const LanguageContextOutputSchema = z.object({
  information: z.string().describe('AI-generated information about the provided language topic.'),
});
export type LanguageContextOutput = z.infer<typeof LanguageContextOutputSchema>;

export async function provideLanguageContext(input: LanguageContextInput): Promise<LanguageContextOutput> {
  return provideLanguageContextFlow(input);
}

const languageContextPrompt = ai.definePrompt({
  name: 'languageContextPrompt',
  input: {schema: LanguageContextInputSchema},
  output: {schema: LanguageContextOutputSchema},
  prompt: `You are an AI assistant knowledgeable about world languages, their diversity, and the challenges they face, drawing from general knowledge including concepts similar to those cataloged by Ethnologue.

Contextual Information on World Languages:
The Ethnologue guide, a comprehensive catalog of the world's languages, lists around 7,139 officially known languages. This number is dynamic, as new languages are identified and others become disused. A significant concern is language endangerment; many languages have fewer than 1,000 speakers and are often not integrated into educational curricula, putting them at risk.

{{#if clanLanguageContext}}
Specific Clan Context:
{{{clanLanguageContext}}}
{{/if}}

Based on this background and the user's topic below, provide relevant information.

User Topic:
{{{topic}}}

Ensure your output strictly adheres to the requested JSON schema, providing the information in the 'information' field.
`,
});

const provideLanguageContextFlow = ai.defineFlow(
  {
    name: 'provideLanguageContextFlow',
    inputSchema: LanguageContextInputSchema,
    outputSchema: LanguageContextOutputSchema,
  },
  async (input: LanguageContextInput) => {
    const {output} = await languageContextPrompt(input);
    if (!output) {
      throw new Error("Language Context Agent failed to produce information.");
    }
    return output;
  }
);
