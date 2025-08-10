// src/lib/models/request-models.ts
import { z } from 'zod';

export const InitializeRequestSchema = z.object({
  role: z.enum(['SDE', 'Data Scientist', 'Product Manager']),
  resume_content: z.string().min(1, 'Resume content is required'),
});

export const InterviewAnswerSchema = z.object({
  question_id: z.number(),
  question_text: z.string(),
  answer_text: z.string(),
  answer_duration: z.number(),
});

export const SubmitInterviewRequestSchema = z.object({
  session_id: z.string().uuid(),
  userId: z.string(),
  interview_data: z.array(InterviewAnswerSchema),
});

export type InitializeRequest = z.infer<typeof InitializeRequestSchema>;
export type InterviewAnswer = z.infer<typeof InterviewAnswerSchema>;
export type SubmitInterviewRequest = z.infer<typeof SubmitInterviewRequestSchema>;