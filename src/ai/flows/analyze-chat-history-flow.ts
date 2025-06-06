
'use server';
/**
 * @fileOverview A Genkit flow for analyzing chat history.
 *
 * - analyzeChatHistory - A function that takes chat messages and an analysis prompt, returning an AI-generated analysis.
 * - AnalyzeChatHistoryInput - The input type for the analyzeChatHistory function.
 * - AnalyzeChatHistoryOutput - The return type for the analyzeChatHistory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatMessageSchema = z.object({
  sender: z.string().describe('The sender of the message (e.g., user ID or name).'),
  text: z.string().min(1, 'Message text cannot be empty.').describe('The content of the chat message.'),
});

export const AnalyzeChatHistoryInputSchema = z.object({
  chatMessages: z.array(ChatMessageSchema).min(1, 'At least one chat message is required.').describe('An array of chat messages to be analyzed.'),
  analysisPrompt: z.string().min(10, 'Analysis prompt must be at least 10 characters.').describe('The specific prompt or question guiding the analysis (e.g., "Summarize key themes and sentiment", "Identify unresolved issues").'),
  clanContext: z.string().optional().describe('Optional context about the clan or discussion topic relevant to the analysis.'),
});
export type AnalyzeChatHistoryInput = z.infer<typeof AnalyzeChatHistoryInputSchema>;

export const AnalyzeChatHistoryOutputSchema = z.object({
  analysis: z.string().describe('The AI-generated analysis of the chat history.'),
});
export type AnalyzeChatHistoryOutput = z.infer<typeof AnalyzeChatHistoryOutputSchema>;


export async function analyzeChatHistory(input: AnalyzeChatHistoryInput): Promise<AnalyzeChatHistoryOutput> {
  return analyzeChatHistoryFlow(input);
}

const chatAnalysisPrompt = ai.definePrompt({
  name: 'chatAnalysisPrompt',
  input: {schema: AnalyzeChatHistoryInputSchema},
  output: {schema: AnalyzeChatHistoryOutputSchema},
  prompt: `You are an AI assistant specialized in analyzing chat conversations.
You will be given a series of chat messages and a specific analysis prompt.

Analysis Prompt:
{{{analysisPrompt}}}

{{#if clanContext}}
Relevant Clan Context:
{{{clanContext}}}
{{/if}}

Chat History:
{{#each chatMessages}}
{{this.sender}}: {{{this.text}}}
{{/each}}

Based on the chat history and the analysis prompt, provide a comprehensive analysis.
Ensure your output strictly adheres to the requested JSON schema, providing the analysis in the 'analysis' field.
`,
});

const analyzeChatHistoryFlow = ai.defineFlow(
  {
    name: 'analyzeChatHistoryFlow',
    inputSchema: AnalyzeChatHistoryInputSchema,
    outputSchema: AnalyzeChatHistoryOutputSchema,
  },
  async (input: AnalyzeChatHistoryInput) => {
    const {output} = await chatAnalysisPrompt(input);
    if (!output) {
      throw new Error("Chat History Analyzer failed to produce an analysis.");
    }
    return output;
  }
);
