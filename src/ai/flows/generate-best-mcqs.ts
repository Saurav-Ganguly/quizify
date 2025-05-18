
'use server';
/**
 * @fileOverview Selects the "best" MCQs from a larger collection by returning their indices.
 *
 * - generateBestMcqs - A function to select the best MCQs.
 * - GenerateBestMcqsInput - The input type (all MCQs and desired count).
 * - GenerateBestMcqsOutput - The output type (selected MCQs as full objects).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Mcq as McqType } from '@/lib/types'; // Import McqType to avoid naming conflict with schema

// Schema for individual MCQs (as they appear in the input and final output)
const McqSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).describe('The options for the question. Typically 3-5 options.'),
  correctAnswerIndex: z.number().describe('The 0-indexed correct answer in the options array.'),
  explanation: z.string().describe('The detailed explanation of why the correct answer is correct and distractors are incorrect.'),
});

// Input schema for the flow (remains the same)
const GenerateBestMcqsInputSchema = z.object({
  allMcqs: z.array(McqSchema).describe('A comprehensive list of all available Multiple-Choice Questions, each with an implicit 0-based index.'),
  desiredCount: z.number().int().positive().describe('The desired number of "best" MCQs to select (e.g., 100).'),
});
export type GenerateBestMcqsInput = z.infer<typeof GenerateBestMcqsInputSchema>;

// Output schema for the FLOW (remains the same - array of full MCQ objects)
const GenerateBestMcqsOutputSchema = z.object({
  selectedMcqs: z.array(McqSchema).describe('The selected "best" MCQs.'),
});
export type GenerateBestMcqsOutput = z.infer<typeof GenerateBestMcqsOutputSchema>;

// NEW: Output schema for the AI PROMPT (array of indices)
const SelectBestMcqIndicesOutputSchema = z.object({
  selectedIndices: z.array(z.number().int().nonnegative()).describe('An array of 0-based indices corresponding to the selected MCQs from the input list `allMcqs`.'),
});
type SelectBestMcqIndicesOutput = z.infer<typeof SelectBestMcqIndicesOutputSchema>;


export async function generateBestMcqs(
  input: GenerateBestMcqsInput
): Promise<GenerateBestMcqsOutput> {
  // Filter input.allMcqs to ensure they are valid before passing to the AI
  const validAllMcqs = input.allMcqs.filter(mcq => 
    mcq.question && 
    mcq.options && Array.isArray(mcq.options) && mcq.options.every(opt => typeof opt === 'string') &&
    mcq.correctAnswerIndex !== undefined && typeof mcq.correctAnswerIndex === 'number' &&
    mcq.explanation
  );

  if (validAllMcqs.length === 0) {
    return { selectedMcqs: [] };
  }

  const effectiveDesiredCount = Math.min(validAllMcqs.length, input.desiredCount);

  // If the total number of valid MCQs is less than or equal to the desired count, return all of them.
  if (validAllMcqs.length <= input.desiredCount) {
    return { selectedMcqs: validAllMcqs };
  }
  
  return generateBestMcqsFlow({ allMcqs: validAllMcqs, desiredCount: effectiveDesiredCount });
}

const prompt = ai.definePrompt({
  name: 'selectBestMcqIndicesPrompt', // Renamed prompt for clarity
  input: { schema: GenerateBestMcqsInputSchema }, // Input to AI is still full MCQs + desiredCount
  output: { schema: SelectBestMcqIndicesOutputSchema }, // AI output is now just indices
  prompt: `You are an expert quiz curator and educational content analyst.
You will be provided with a large list of Multiple-Choice Questions (MCQs) in JSON format. Each MCQ object in the input list has a "question", "options", "correctAnswerIndex", and an "explanation".
Your task is to select the '{{desiredCount}}' BEST MCQs from this list and return their original 0-based INDICES from the input list.

When selecting the "best" MCQs, you MUST adhere to the following criteria:
1.  **Topic Coverage**: Aim for a diverse set of questions that cover a broad range of topics present in the input MCQs. Avoid over-representing a single narrow topic.
2.  **Question Quality**: Prioritize questions that are clear, unambiguous, well-formulated, and grammatically correct.
3.  **Distractor Quality**: Prefer questions with plausible distractors. Good distractors are related to the topic and represent common misconceptions, making the question challenging but fair. Avoid questions where the correct answer is immediately obvious due to poor distractors.
4.  **Explanation Quality**: Favor MCQs that have clear, comprehensive, and pedagogical explanations. The explanation should ideally clarify why the correct answer is right and why distractors are wrong.
5.  **Conceptual Depth**: Where possible, select questions that test deeper understanding, application, or analysis of concepts rather than just superficial recall of facts.
6.  **Variety**: If discernible, try to include a mix of question styles or difficulties.
7.  **Uniqueness**: Avoid selecting duplicate or near-duplicate questions if possible. Prioritize distinct questions.

CRITICAL JSON OUTPUT FORMATTING RULES:
1.  Your entire response MUST be a single, valid JSON object.
2.  The JSON object MUST contain a single top-level key: "selectedIndices".
3.  The value of "selectedIndices" MUST be an array of numbers. These numbers are the 0-based indices of the MCQs you selected from the original 'allMcqs' input list.
4.  You MUST return exactly '{{desiredCount}}' indices if at least that many MCQs are provided in the input. If the total number of provided MCQs is less than {{desiredCount}}, then you should return indices for all of them.
5.  The indices should be valid (i.e., within the bounds of the input 'allMcqs' array).
6.  Do not return the MCQ objects themselves, only their indices.

Input MCQs (JSON format, you will refer to these by their 0-based index):
{{{json allMcqs}}}

Example of expected output format (if you selected the MCQs at index 0, 5, and 12 from the input):
{
  "selectedIndices": [0, 5, 12]
}

Based on the criteria, select the {{desiredCount}} best MCQs and return their indices.
`,
});

const generateBestMcqsFlow = ai.defineFlow(
  {
    name: 'generateBestMcqsFlow',
    inputSchema: GenerateBestMcqsInputSchema, // Flow input
    outputSchema: GenerateBestMcqsOutputSchema, // Flow output (full MCQs)
  },
  async (input: GenerateBestMcqsInput): Promise<GenerateBestMcqsOutput> => {
    // Defensive check
    if (input.allMcqs.length <= input.desiredCount) {
      return { selectedMcqs: input.allMcqs };
    }

    const {output: indicesOutput} = await prompt(input); // AI returns indices

    if (indicesOutput && Array.isArray(indicesOutput.selectedIndices)) {
      const selectedMcqs: McqType[] = [];
      for (const index of indicesOutput.selectedIndices) {
        if (index >= 0 && index < input.allMcqs.length) {
          selectedMcqs.push(input.allMcqs[index]);
        } else {
          console.warn(`AI returned an invalid index: ${index}. Max index: ${input.allMcqs.length -1}`);
        }
      }
      // Ensure we don't return more than desiredCount due to AI misinterpretation or duplicates
      return { selectedMcqs: selectedMcqs.slice(0, input.desiredCount) };
    }
    
    // Fallback or error handling if AI output is malformed or indices are not usable
    console.warn('AI output for best MCQ indices selection was malformed or unusable. Returning a random subset as fallback.', input);
    const shuffled = [...input.allMcqs].sort(() => 0.5 - Math.random());
    return { selectedMcqs: shuffled.slice(0, input.desiredCount) };
  }
);

// Helper to ensure McqType matches McqSchema for type consistency
const _mcqTypeCheck: McqType = {} as z.infer<typeof McqSchema>;
const _mcqSchemaCheck: z.infer<typeof McqSchema> = {} as McqType;

    