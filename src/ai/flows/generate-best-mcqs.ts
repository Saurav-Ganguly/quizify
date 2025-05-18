
'use server';
/**
 * @fileOverview Selects the "best" MCQs from a larger collection.
 *
 * - generateBestMcqs - A function to select the best MCQs.
 * - GenerateBestMcqsInput - The input type (all MCQs and desired count).
 * - GenerateBestMcqsOutput - The output type (selected MCQs).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Mcq as McqType } from '@/lib/types'; // Import McqType to avoid naming conflict with schema

// Define McqSchema locally or import if it's made shareable
const McqSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).describe('The options for the question. Typically 3-5 options.'),
  correctAnswerIndex: z.number().describe('The 0-indexed correct answer in the options array.'),
  explanation: z.string().describe('The detailed explanation of why the correct answer is correct and distractors are incorrect.'),
});

const GenerateBestMcqsInputSchema = z.object({
  allMcqs: z.array(McqSchema).describe('A comprehensive list of all available Multiple-Choice Questions.'),
  desiredCount: z.number().int().positive().describe('The desired number of "best" MCQs to select (e.g., 100).'),
});
export type GenerateBestMcqsInput = z.infer<typeof GenerateBestMcqsInputSchema>;

const GenerateBestMcqsOutputSchema = z.object({
  selectedMcqs: z.array(McqSchema).describe('The selected "best" MCQs.'),
});
export type GenerateBestMcqsOutput = z.infer<typeof GenerateBestMcqsOutputSchema>;

export async function generateBestMcqs(
  input: GenerateBestMcqsInput
): Promise<GenerateBestMcqsOutput> {
  // If the total number of MCQs is less than or equal to the desired count, return all of them.
  if (input.allMcqs.length <= input.desiredCount) {
    return { selectedMcqs: input.allMcqs };
  }
  return generateBestMcqsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBestMcqsPrompt',
  input: { schema: GenerateBestMcqsInputSchema },
  output: { schema: GenerateBestMcqsOutputSchema },
  prompt: `You are an expert quiz curator and educational content analyst.
You will be provided with a large list of Multiple-Choice Questions (MCQs). Each MCQ object has a "question", "options" (an array of strings), "correctAnswerIndex" (a 0-indexed number), and an "explanation".
Your task is to select the '{{desiredCount}}' BEST MCQs from this list. If the total number of provided MCQs is less than {{desiredCount}}, then you should select all of them.

When selecting the "best" MCQs, you MUST adhere to the following criteria:
1.  **Topic Coverage**: Aim for a diverse set of questions that cover a broad range of topics present in the input MCQs. Avoid over-representing a single narrow topic.
2.  **Question Quality**: Prioritize questions that are clear, unambiguous, well-formulated, and grammatically correct.
3.  **Distractor Quality**: Prefer questions with plausible distractors. Good distractors are related to the topic and represent common misconceptions, making the question challenging but fair. Avoid questions where the correct answer is immediately obvious due to poor distractors.
4.  **Explanation Quality**: Favor MCQs that have clear, comprehensive, and pedagogical explanations. The explanation should ideally clarify why the correct answer is right and why distractors are wrong.
5.  **Conceptual Depth**: Where possible, select questions that test deeper understanding, application, or analysis of concepts rather than just superficial recall of facts.
6.  **Variety**: If discernible, try to include a mix of question styles or difficulties.
7.  **Uniqueness**: Avoid selecting duplicate or near-duplicate questions if possible. Prioritize distinct questions.

You MUST return exactly '{{desiredCount}}' MCQs if at least that many are provided, or all MCQs if fewer than '{{desiredCount}}' are provided.
The output MUST be a JSON object with a single top-level key "selectedMcqs". The value of "selectedMcqs" MUST be an array of MCQ objects.
Each MCQ object in the "selectedMcqs" array MUST be complete and contain ALL original fields: "question" (string), "options" (array of strings), "correctAnswerIndex" (number), and "explanation" (string).

Input MCQs (JSON format):
{{{json allMcqs}}}

Ensure your response is a single, valid JSON object adhering to the specified output schema.
`,
});

const generateBestMcqsFlow = ai.defineFlow(
  {
    name: 'generateBestMcqsFlow',
    inputSchema: GenerateBestMcqsInputSchema,
    outputSchema: GenerateBestMcqsOutputSchema,
  },
  async (input: GenerateBestMcqsInput) => {
    // Defensive check, though handled in the wrapper too.
    if (input.allMcqs.length <= input.desiredCount) {
      return { selectedMcqs: input.allMcqs };
    }
    const {output} = await prompt(input);
    if (output && Array.isArray(output.selectedMcqs)) {
      // Ensure we don't return more than desiredCount due to AI misinterpretation
      return { selectedMcqs: output.selectedMcqs.slice(0, input.desiredCount) };
    }
    // Fallback or error handling if AI output is malformed
    console.warn('AI output for best MCQ selection was malformed. Returning a random subset as fallback.', input);
    // Simple random shuffle and slice as a basic fallback
    const shuffled = [...input.allMcqs].sort(() => 0.5 - Math.random());
    return { selectedMcqs: shuffled.slice(0, input.desiredCount) };
  }
);

// Helper to ensure McqType matches McqSchema for type consistency
const _mcqTypeCheck: McqType = {} as z.infer<typeof McqSchema>;
const _mcqSchemaCheck: z.infer<typeof McqSchema> = {} as McqType;
