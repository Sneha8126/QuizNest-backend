import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const quizSettingsSchema = z.object({
  numQuestions: z.number().int().min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']),
  questionType: z.enum(['mcq', 'true_false', 'multiple_correct', 'short_answer', 'mixed']),
  timeLimitMinutes: z.number().int().min(1).max(180).nullable(),
  negativeMarking: z.boolean().default(false),
  passingPercentage: z.number().min(0).max(100).default(60),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
});

export const generateQuizSchema = z.object({
  documentId: z.string().min(1),
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  settings: quizSettingsSchema,
});

export const updateQuizSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  settings: quizSettingsSchema.partial().optional(),
  questions: z.array(z.any()).optional(),
});

export const submitAttemptSchema = z.object({
  quizId: z.string().min(1),
  participantName: z.string().min(1).max(80),
  timeTakenSeconds: z.number().int().min(0),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      givenAnswer: z.union([z.string(), z.array(z.string()), z.null()]),
    })
  ),
});
