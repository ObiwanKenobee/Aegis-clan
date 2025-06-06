
'use server';
/**
 * @fileOverview A Genkit flow for processing rite data before logging.
 *
 * - logRite - A function that processes and prepares rite data.
 * - LogRiteInput - The input type for the logRite function.
 * - ProcessedRiteData - The return type for the logRite function (data ready for Firestore).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Based on rites.schema.json
export const LogRiteInputSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required.'),
  type: z.string().min(3, 'Rite type is required (e.g., marriage, birth, funeral).'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Date must be a valid date string.",
  }),
  officiant: z.string().min(1, 'Officiant ID or name is required.'),
  audioArchiveUrl: z.string().url().optional().describe('Optional URL to an audio recording of the rite.'),
  notes: z.string().optional().describe('Optional notes or details about the rite.'),
  blessingScripture: z.string().optional().describe('Optional scriptural reference for a blessing.'),
  // clanId will be passed by the API route, not directly part of the AI flow's primary input transformation
});
export type LogRiteInput = z.infer<typeof LogRiteInputSchema>;

// This schema represents the data processed by the AI flow, ready for the API route to use for Firestore.
export const ProcessedRiteDataSchema = z.object({
  summary: z.string().describe('A brief AI-generated summary of the rite.'),
  isoDate: z.string().describe("Date of the rite in ISO 8601 format for consistent storage."),
  // The original input is also included, perhaps with minor standardizations if any were made.
  originalInput: LogRiteInputSchema
});
export type ProcessedRiteData = z.infer<typeof ProcessedRiteDataSchema>;


export async function logRite(input: LogRiteInput): Promise<ProcessedRiteData> {
  // This flow primarily structures data and generates a summary.
  // AI could also be used here to:
  // - Suggest blessing scriptures based on rite type and notes.
  // - Validate cultural appropriateness if more context is provided.
  return logRiteProcessingFlow(input);
}

const riteProcessingPrompt = ai.definePrompt({
  name: 'riteProcessingPrompt',
  input: {schema: LogRiteInputSchema},
  // The prompt output is just the summary and ISO date.
  output: {schema: z.object({ summary: z.string(), isoDate: z.string() }) }, 
  prompt: `
    A new rite is being logged with the following details:
    Type: {{{type}}}
    Member ID: {{{memberId}}}
    Date: {{{date}}}
    Officiant: {{{officiant}}}
    {{#if notes}}Notes: {{{notes}}}{{/if}}
    {{#if blessingScripture}}Blessing Scripture: {{{blessingScripture}}}{{/if}}

    Based on these details:
    1. Provide a concise one-sentence summary for this rite.
    2. Convert the provided date "{{{date}}}" into ISO 8601 format (YYYY-MM-DD).
    
    Return ONLY the summary and the ISO date in the specified JSON schema.
  `,
});

const logRiteProcessingFlow = ai.defineFlow(
  {
    name: 'logRiteProcessingFlow', // Renamed to avoid conflict if there's another 'logRiteFlow'
    inputSchema: LogRiteInputSchema,
    outputSchema: ProcessedRiteDataSchema, 
  },
  async (input: LogRiteInput) => {
    const {output: promptOutput} = await riteProcessingPrompt(input);

    if (!promptOutput) {
      throw new Error("Failed to get a response from the rite processing prompt.");
    }
    
    return {
      summary: promptOutput.summary,
      isoDate: promptOutput.isoDate,
      originalInput: input // Pass through the original input
    };
  }
);
