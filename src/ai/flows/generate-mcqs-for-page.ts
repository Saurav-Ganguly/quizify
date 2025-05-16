
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
  options: z.array(z.string()).length(4).describe('The four options for the question. Three should be plausible but incorrect distractors, and one correct.'),
  correctAnswerIndex: z.number().min(0).max(3).describe('The 0-indexed correct answer in the options array.'),
  explanation: z.string().describe('The detailed, step-by-step, and pedagogical explanation of why the correct answer is correct and why the distractors are incorrect. This explanation should be well-formatted for readability (e.g., using paragraphs, bullet points, and bold text for emphasis).'),
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
  prompt: `You are an expert quiz creator and subject matter specialist. You are provided with the text content of page {{pageNumber}} from a {{totalPages}}-page document on the subject of '{{{subject}}}'.

The text for this page is:
\`\`\`
{{{pageText}}}
\`\`\`

Your task is to generate exactly 5 high-quality, distinct Multiple-Choice Questions (MCQs) based *exclusively* on the provided text content from THIS PAGE.

For each MCQ, you MUST provide:
1.  **A clear and unambiguous question.**
2.  **Exactly four options:**
    *   One option that is clearly and unequivocally the correct answer based on the provided text.
    *   Three distractor options that are **plausible but definitively incorrect**. These distractors should be related to the topic and designed to make the question challenging, not trivially easy. They could represent common misconceptions, closely related but distinct concepts, or subtly incorrect statements. Avoid options that are obviously absurd or unrelated.
3.  **The 0-indexed integer for \`correctAnswerIndex\`** indicating which of the four options is correct.
4.  **A detailed, step-by-step, and pedagogical \`explanation\`**:
    *   This explanation should be comprehensive enough that a student can understand *why* the correct answer is correct.
    *   If applicable, briefly explain *why* the key distractor(s) are incorrect.
    *   The explanation MUST be **well-formatted for maximum readability**. This means:
        *   Use clear paragraphs to separate distinct ideas or steps.
        *   Employ bullet points or numbered lists for sequential information, multiple reasons, or key takeaways (e.g., use '*' or '-' for bullets, '1.', '2.' for numbered lists).
        *   Use **bold text** (e.g., by enclosing in asterisks like *this*) to highlight crucial terms, keywords, or parts of the explanation.

CRITICAL JSON FORMATTING RULES:
1.  Your entire response MUST be a single, valid JSON object.
2.  The JSON object MUST contain a single top-level key: "mcqs".
3.  The value of "mcqs" MUST be an array of MCQ objects.
4.  EVERY MCQ object within the \`mcqs\` array MUST be COMPLETE and contain ALL FOUR required fields: \`question\` (string), \`options\` (array of 4 strings), \`correctAnswerIndex\` (number, 0-3), and \`explanation\` (string). Ensure the data types are correct as specified and that no field is empty or missing.
5.  The 'mcqs' array for this page MUST contain exactly 5 such MCQ objects. Do not generate more or less than 5.

Example of ONE MCQ object structure (content will vary based on the provided text):
{
  "question": "What is the primary function of X according to the text?",
  "options": ["Plausible Distractor A", "Correct Answer B", "Plausible Distractor C", "Plausible Distractor D"],
  "correctAnswerIndex": 1,
  "explanation": "The text states that X's primary function is B because... Let's break this down:\\n\\n*Why B is Correct:*\\n1. Evidence point 1 from the text supporting B.\\n2. Evidence point 2 from the text supporting B.\\n\\n*Why Other Options are Incorrect:*\\n- Option A is incorrect because the text indicates...\\n- Option C, while related, is not the *primary* function described..."
}

VERY IMPORTANT FINAL CHECK: Ensure the last MCQ object in the 'mcqs' array is complete and valid, and that all 5 MCQs are present and correctly formatted as per the schema and instructions above. Focus on high-quality questions, plausible distractors, and comprehensive, well-formatted explanations.
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
