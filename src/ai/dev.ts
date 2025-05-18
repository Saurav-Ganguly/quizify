
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-mcqs-from-pdf.ts';
import '@/ai/flows/generate-mcqs-for-page.ts';
import '@/ai/flows/elaborate-mcq-explanation.ts';
import '@/ai/flows/generate-best-mcqs.ts'; // Added new flow

