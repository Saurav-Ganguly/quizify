
'use server';
/**
 * @fileOverview Generates multiple-choice questions (MCQs) from the text content of a single PDF page.
 *
 * - generateMcqsForPage - A function that handles the MCQ generation for a single page.
 * - GenerateMcqsForPageInput - The input type for the generateMcqsForPage function.
 * - GenerateMcqsForPageOutput - The return type for the generateMcqsForPage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const McqSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).length(4).describe('The four options for the question.'),
  correctAnswerIndex: z.number().min(0).max(3).describe('The 0-indexed correct answer in the options array.'),
  explanation: z.string().describe('The detailed explanation of the answer.'),
});

const GenerateMcqsForPageInputSchema = z.object({
  pageText: z.string().describe('The text content of a single PDF page.'),
  subject: z.string().describe('The subject of the PDF document.'),
  pageNumber: z.number().describe('The current page number being processed.'),
  totalPages: z.number().describe('The total number of pages in the document.'),
});
export type GenerateMcqsForPageInput = z.infer<typeof GenerateMcqsForPageInputSchema>;

const GenerateMcqsForPageOutputSchema = z.object({
  mcqs: z.array(McqSchema).describe('The generated multiple-choice questions with explanations for this page.'),
});
export type GenerateMcqsForPageOutput = z.infer<typeof GenerateMcqsForPageOutputSchema>;

export async function generateMcqsForPage(
  input: GenerateMcqsForPageInput
): Promise<GenerateMcqsForPageOutput> {
  return generateMcqsForPageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMcqsForPagePrompt',
  input: {schema: GenerateMcqsForPageInputSchema},
  output: {schema: GenerateMcqsForPageOutputSchema},
  prompt: `You are an expert examiner. You are provided with the text content of page {{pageNumber}} from a {{totalPages}}-page document on the subject of '{{{subject}}}'.

The text for this page is:
\`\`\`
{{{pageText}}}
\`\`\`

Your task is to generate exactly 5 high-quality, distinct Multiple-Choice Questions (MCQs) based *exclusively* on the provided text content from THIS PAGE. Each MCQ must have a question, 4 options, the index of the correct answer (0-indexed), and a detailed explanation.

CRITICAL FORMATTING RULES:
1.  Your entire response MUST be a single, valid JSON object.
2.  The JSON object MUST contain a single top-level key: "mcqs".
3.  The value of "mcqs" MUST be an array of MCQ objects.
4.  EVERY MCQ object within the \`mcqs\` array MUST be COMPLETE and contain ALL FOUR required fields: \`question\` (string), \`options\` (array of 4 strings), \`correctAnswerIndex\` (number, 0-3), and \`explanation\` (string). Do not omit any of these fields for any question, and ensure the data types are correct as specified.
5.  The 'mcqs' array for this page MUST contain exactly 5 such MCQ objects. Do not generate more or less than 5.

Example of ONE MCQ object:
{
  "question": "What is the primary topic of this section?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswerIndex": 0,
  "explanation": "The section clearly states..."
}

VERY IMPORTANT FINAL CHECK: Ensure the last MCQ object in the 'mcqs' array is complete and valid, and that all 5 MCQs are present and correctly formatted as per the schema.
`,
});

const generateMcqsForPageFlow = ai.defineFlow(
  {
    name: 'generateMcqsForPageFlow',
    inputSchema: GenerateMcqsForPageInputSchema,
    outputSchema: GenerateMcqsForPageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Basic validation to ensure we have an array of MCQs, even if empty, to prevent downstream errors.
    // The schema validation handles the content of the MCQs.
    if (output && Array.isArray(output.mcqs)) {
        return output;
    }
    // If output is malformed or mcqs is not an array, return an empty mcqs array to satisfy schema.
    // This helps prevent crashes if the AI returns a completely unexpected structure.
    // Further error handling might be needed based on how strict we want to be.
    console.warn('AI output for page generation was malformed, returning empty MCQs for this page.', input);
    return { mcqs: [] };
  }
);
