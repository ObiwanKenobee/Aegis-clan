
'use server';
/**
 * @fileOverview A Genkit flow for simulating threat detection.
 *
 * - detectThreats - A function that takes descriptions of security events/alerts and an analysis focus, returning potential prioritized threats.
 * - DetectThreatsInput - The input type for the detectThreats function.
 * - DetectThreatsOutput - The return type for the detectThreats function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SecurityEventSchema = z.object({
  id: z.string().optional().describe('An optional unique identifier for the event or alert.'),
  timestamp: z.string().optional().describe('Timestamp of the event.'),
  source: z.string().optional().describe('Source of the event (e.g., firewall, EDR, IDS).'),
  description: z.string().min(10, 'Event description must be at least 10 characters.').describe('A textual description of the security event or alert data.'),
});

export const DetectThreatsInputSchema = z.object({
  events: z.array(SecurityEventSchema).min(1, 'At least one security event is required.').describe('An array of security events or alerts to be analyzed.'),
  detectionFocus: z.string().optional().describe('Optional: Specific focus for threat detection (e.g., "insider threat activity", "malware indicators", "network intrusion patterns"). Defaults to general threat assessment.'),
});
export type DetectThreatsInput = z.infer<typeof DetectThreatsInputSchema>;

const DetectedThreatSchema = z.object({
  threatId: z.string().describe('A unique identifier assigned to this detected threat.'),
  title: z.string().describe('A concise title for the potential threat (e.g., "Potential Ransomware Activity", "Anomalous Login Attempt").'),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low', 'Informational']).describe('Assessed severity of the threat.'),
  description: z.string().describe('A summary of why this is considered a potential threat and which events are correlated.'),
  correlatedEventIds: z.array(z.string()).optional().describe('IDs of the input events that contribute to this detected threat, if IDs were provided.'),
  recommendedAction: z.string().describe('Immediate recommended action (e.g., "Investigate further", "Monitor activity", "Escalate to Tier 2").')
});

export const DetectThreatsOutputSchema = z.object({
  detectedThreats: z.array(DetectedThreatSchema).describe('A list of potential threats detected and prioritized from the input events.'),
});
export type DetectThreatsOutput = z.infer<typeof DetectThreatsOutputSchema>;

export async function detectThreats(input: DetectThreatsInput): Promise<DetectThreatsOutput> {
  return detectThreatsFlow(input);
}

const threatDetectionPrompt = ai.definePrompt({
  name: 'threatDetectionPrompt',
  input: {schema: DetectThreatsInputSchema},
  output: {schema: DetectThreatsOutputSchema},
  prompt: `You are an AI SOC Analyst for an XDR (Extended Detection and Response) system.
Your task is to analyze incoming security events/alerts and identify potential threats.

Focus: {{{detectionFocus || 'General threat assessment based on common attack patterns and anomalies.'}}}

Security Events/Alerts:
{{#each events}}
---
Event ID: {{{this.id | | 'N/A'}}}
Timestamp: {{{this.timestamp || 'N/A'}}}
Source: {{{this.source || 'N/A'}}}
Description: {{{this.description}}}
---
{{/each}}

Based on the provided events and the detection focus:
1. Correlate related events if applicable.
2. Identify potential threats. For each threat, provide a unique threatId (e.g., threat-{{@index}}), a title, assess its severity (Critical, High, Medium, Low, Informational), describe why it's a threat, list correlated event IDs (if provided in input), and suggest an immediate recommended action.
3. If no significant threats are detected, return an empty array for 'detectedThreats'.

Ensure your output strictly adheres to the requested JSON schema for DetectThreatsOutput.
Assign a unique 'threatId' to each detected threat.
Prioritize actionable and clear descriptions.
`,
});

const detectThreatsFlow = ai.defineFlow(
  {
    name: 'detectThreatsFlow',
    inputSchema: DetectThreatsInputSchema,
    outputSchema: DetectThreatsOutputSchema,
  },
  async (input: DetectThreatsInput) => {
    const {output} = await threatDetectionPrompt(input);
    if (!output) {
      throw new Error("Threat Detection AI failed to produce an output.");
    }
    return {
        detectedThreats: output.detectedThreats || [],
    };
  }
);
