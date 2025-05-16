'use server';
/**
 * @fileOverview Elaborates on an existing explanation for a multiple-choice question.
 *
 * - elaborateMcqExplanation - A function that handles the explanation elaboration process.
 * - ElaborateMcqExplanationInput - The input type for the elaborateMcqExplanation function.
 * - ElaborateMcqExplanationOutput - The return type for the elaborateMcqExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ElaborateMcqExplanationInputSchema = z.object({
  subject: z.string().describe('The subject of the quiz for context.'),
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).describe('The options for the question.'),
  correctAnswerIndex: z.number().describe('The 0-indexed correct answer in the options array.'),
  currentExplanation: z.string().describe('The existing explanation that needs elaboration.'),
});
export type ElaborateMcqExplanationInput = z.infer<typeof ElaborateMcqExplanationInputSchema>;

const ElaborateMcqExplanationOutputSchema = z.object({
  elaboratedExplanation: z.string().describe('The new, more detailed and pedagogical explanation.'),
});
export type ElaborateMcqExplanationOutput = z.infer<typeof ElaborateMcqExplanationOutputSchema>;

export async function elaborateMcqExplanation(
  input: ElaborateMcqExplanationInput
): Promise<ElaborateMcqExplanationOutput> {
  return elaborateMcqExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'elaborateMcqExplanationPrompt',
  input: {schema: ElaborateMcqExplanationInputSchema},
  output: {schema: ElaborateMcqExplanationOutputSchema},
  prompt: `You are an expert teacher tasked with providing a more detailed and comprehensive explanation for a multiple-choice question.
The user found the current explanation insufficient and needs a better one.

Subject: {{{subject}}}

Question: {{{question}}}
Options:
{{#each options}}
  - {{{this}}}
{{/each}}
Correct Answer Index: {{{correctAnswerIndex}}} (0-indexed, meaning option '{{{options.[correctAnswerIndex]}}}' is correct)

Current Explanation (which was found insufficient):
"{{{currentExplanation}}}"

Your task is to generate a new, more ELABORATED explanation. This new explanation should:
1.  Be significantly more detailed than the current one.
2.  Explain the concept thoroughly, as if you are a teacher explaining it to a student who is struggling.
3.  Clearly explain why the correct answer is correct.
4.  If applicable and helpful, briefly explain why the other options are incorrect.
5.  Be easy to understand, clear, and pedagogical.
6.  Use simple language where possible, but be accurate.
7.  Break down complex ideas into smaller, digestible parts if necessary.

CRITICAL FORMATTING RULES:
1.  Your entire response MUST be a single, valid JSON object.
2.  The JSON object MUST contain a single top-level key: "elaboratedExplanation".
3.  The value of "elaboratedExplanation" MUST be a string containing the new, detailed explanation.

Example of the output format:
{
  "elaboratedExplanation": "The concept of X is crucial here because... The correct option (Option A) directly addresses this by... Option B is incorrect because it overlooks... Option C is a common misconception related to Y, but in this context... Finally, Option D fails to consider..."
}

Focus on providing a high-quality, in-depth explanation.
`,
});

const elaborateMcqExplanationFlow = ai.defineFlow(
  {
    name: 'elaborateMcqExplanationFlow',
    inputSchema: ElaborateMcqExplanationInputSchema,
    outputSchema: ElaborateMcqExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output && output.elaboratedExplanation) {
        return output;
    }
    // Fallback if AI output is malformed
    console.warn('AI output for explanation elaboration was malformed.', input);
    return { elaboratedExplanation: "Could not retrieve a more detailed explanation at this time. The original explanation was: " + input.currentExplanation };
  }
);
