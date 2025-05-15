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
  prompt: `You are an examiner creating multiple-choice questions from a PDF document.

You will receive the PDF as a data URI and the subject of the PDF.
Your task is to generate a comprehensive set of MCQs with detailed explanations, so the
student can thoroughly test their understanding of the material and prepare effectively for exams.

Generate as many and as high-quality questions as possible so that through the MCQs a person can understand the whole PDF.
The solution must be easy to understand, like a teacher is making you understand.

Subject: {{{subject}}}
PDF: {{media url=pdfDataUri}}

Output MCQs in the following JSON format:
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
