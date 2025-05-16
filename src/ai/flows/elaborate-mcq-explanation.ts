
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
  elaboratedExplanation: z.string().describe('The new, more detailed and pedagogical explanation, formatted for readability.'),
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
  prompt: `You are an expert teacher tasked with providing a more detailed, comprehensive, and well-formatted explanation for a multiple-choice question.
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

Your task is to generate a new, more ELABORATED explanation. This new explanation MUST:
1.  Be significantly more detailed than the current one.
2.  Explain the core concept(s) thoroughly, as if you are a teacher explaining it to a student who is struggling.
3.  Clearly explain step-by-step *why* the correct answer is correct, referencing specific parts of the concept if possible.
4.  If applicable and helpful, briefly explain *why* each of the other options are incorrect.
5.  Be easy to understand, clear, and pedagogical.
6.  Use simple language where possible, but maintain accuracy.
7.  **Crucially, format the explanation for maximum readability and understanding. This means:**
    *   **Use clear paragraphs** to separate distinct ideas or steps in the explanation.
    *   **Employ bullet points or numbered lists** for sequential information, multiple reasons, or key takeaways. (e.g., use '*' or '-' for bullets, '1.', '2.' for numbered lists).
    *   Use **bold text** (e.g., by enclosing in asterisks like *this* for the AI to interpret, though final rendering might depend on markdown support on client) to highlight crucial terms, keywords, or parts of the explanation.
    *   Structure your explanation logically. For example:
        1.  Start with a brief overview of the main concept.
        2.  Detail why the correct answer is right.
        3.  Explain why incorrect options are wrong.
        4.  Conclude with a summary or key takeaway if helpful.

CRITICAL JSON FORMATTING RULES:
1.  Your entire response MUST be a single, valid JSON object.
2.  The JSON object MUST contain a single top-level key: "elaboratedExplanation".
3.  The value of "elaboratedExplanation" MUST be a string containing the new, detailed, and well-formatted explanation. All formatting (paragraphs, lists, bold indicators) must be part of this string.

Example of the output format (note the formatting within the string):
{
  "elaboratedExplanation": "The concept of X is crucial here because it relates to Y and Z. Let's break this down:\\n\\n*Why the Correct Answer (Option A) is Right:*\\nOption A directly addresses the core principle of X by stating... This is supported by the fact that... Furthermore, consider the following points:\\n1. Point one about Option A.\\n2. Point two about Option A.\\n\\n*Why Other Options are Incorrect:*\\n- **Option B** is incorrect because it overlooks the critical aspect of...\\n- **Option C** is a common misconception related to Y, but in this specific context, it doesn't apply because...\\n- **Option D** fails to consider the implications of...\\n\\nIn summary, understanding X is key to choosing the correct answer."
}

Focus on providing a high-quality, in-depth, and exceptionally clear explanation.
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

