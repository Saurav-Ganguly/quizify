
// src/ai/flows/generate-mcqs-from-pdf.ts
'use server';

/**
 * @fileOverview Generates multiple-choice questions (MCQs) with detailed explanations from a PDF.
 *
 * - generateMcqsFromPdf - A function that handles the MCQ generation process.
 * - GenerateMcqsFromPdfInput - The input type for the generateMcqsFromPdf function.
 * - GenerateMcqsFromPdfOutput - The return type for the generateMcqsFromPdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMcqsFromPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "The PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  subject: z.string().describe('The subject of the PDF document.'),
});
export type GenerateMcqsFromPdfInput = z.infer<typeof GenerateMcqsFromPdfInputSchema>;

const GenerateMcqsFromPdfOutputSchema = z.object({
  mcqs: z
    .array(
      z.object({
        question: z.string().describe('The multiple-choice question.'),
        options: z.array(z.string()).describe('The options for the question.'),
        correctAnswerIndex: z
          .number()
          .describe('The index of the correct answer in the options array.'),
        explanation: z.string().describe('The detailed explanation of the answer.'),
      })
    )
    .describe('The generated multiple-choice questions with explanations.'),
});
export type GenerateMcqsFromPdfOutput = z.infer<typeof GenerateMcqsFromPdfOutputSchema>;

export async function generateMcqsFromPdf(
  input: GenerateMcqsFromPdfInput
): Promise<GenerateMcqsFromPdfOutput> {
  return generateMcqsFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMcqsFromPdfPrompt',
  input: {schema: GenerateMcqsFromPdfInputSchema},
  output: {schema: GenerateMcqsFromPdfOutputSchema},
  prompt: `You are an expert examiner tasked with creating a comprehensive set of multiple-choice questions (MCQs) from a PDF document. Your primary goal is to ensure thorough coverage of the entire PDF document.

You will receive the PDF as a data URI and the subject of the PDF.
Your task is to generate a detailed and exhaustive set of MCQs with clear, step-by-step explanations. The purpose of these MCQs is to allow a student to thoroughly test their understanding of all material presented in the PDF and prepare effectively for exams.

**Key Requirements:**
1.  **Mandatory & Exhaustive Coverage:** You **MUST** generate **a minimum of 5 distinct, high-quality MCQs for EACH AND EVERY PAGE** of the provided PDF document. This is a strict and critical requirement. For example, if the PDF has 10 pages, your output **MUST** contain at least 50 MCQs. If it has 77 pages, it must contain at least 385 MCQs. The questions should collectively ensure exhaustive coverage of ALL key concepts, definitions, important facts, examples, and any nuanced information present throughout the ENTIRE document. Do not miss any significant information from any page.
2.  **High Quality:** Questions should be clear, unambiguous, and well-formulated. Options should be plausible, with one clearly correct answer.
3.  **Detailed Explanations:** For each MCQ, provide a detailed explanation for the correct answer. The explanation should be easy to understand, as if a teacher is explaining the concept, and should clarify why the correct option is right and potentially why other options are incorrect.

The ultimate goal is to produce a comprehensive quiz that allows a student to be thoroughly tested on every significant aspect of the PDF. Ensure your response is complete and contains all generated MCQs, even if the total number is very large. Do not truncate your output or omit any questions.

Subject: {{{subject}}}
PDF: {{media url=pdfDataUri}}

Output MCQs in the following JSON format. **Your entire response MUST be a single, valid JSON object matching this structure. Critically, ensure that EVERY MCQ object within the \`mcqs\` array is COMPLETE and contains ALL FOUR required fields: \`question\` (as a string), \`options\` (as an array of strings), \`correctAnswerIndex\` (as a number), and \`explanation\` (as a string). Do not omit any of these fields for any question, and ensure the data types are correct as specified.**
{
  "mcqs": [
    {
      "question": "The multiple-choice question.",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswerIndex": 0,
      "explanation": "The detailed explanation of the answer."
    }
  ]
}
`,
});

const generateMcqsFromPdfFlow = ai.defineFlow(
  {
    name: 'generateMcqsFromPdfFlow',
    inputSchema: GenerateMcqsFromPdfInputSchema,
    outputSchema: GenerateMcqsFromPdfOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

