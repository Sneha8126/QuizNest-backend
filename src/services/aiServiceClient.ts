import { env } from '../config/env';
import { ApiError } from '../middleware/errorHandler';
import { IQuestion } from '../models/Question';

interface GenerateQuestionsRequest {
  documentBuffer: Buffer;
  documentName: string;
  mimeType: string;
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionType: 'mcq' | 'true_false' | 'multiple_correct' | 'short_answer' | 'mixed';
}

interface GenerateQuestionsResponse {
  questions: IQuestion[];
}

async function callAiJson<T>(pathname: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.aiServiceUrl}${pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.aiServiceApiKey ? { 'X-API-Key': env.aiServiceApiKey } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(502, 'Could not reach the AI service. Check AI_SERVICE_URL.');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(502, `AI service error (${response.status}): ${text || 'unknown error'}`);
  }
  return (await response.json()) as T;
}

export async function generateQuestionsFromDocument(
  req: GenerateQuestionsRequest
): Promise<IQuestion[]> {
  // Send the actual document bytes to the AI service. The AI service therefore
  // never depends on the backend's local filesystem and can be deployed separately.
  const form = new FormData();
 const fileBlob = new Blob(
  [new Uint8Array(req.documentBuffer)],
  { type: req.mimeType }
);

form.append('file', fileBlob, req.documentName);
  form.append('mimeType', req.mimeType);
  form.append('numQuestions', String(req.numQuestions));
  form.append('difficulty', req.difficulty);
  form.append('questionType', req.questionType);

  let response: Response;
  try {
    response = await fetch(`${env.aiServiceUrl}/generate-questions`, {
      method: 'POST',
      headers: env.aiServiceApiKey ? { 'X-API-Key': env.aiServiceApiKey } : {},
      body: form,
    });
  } catch {
    throw new ApiError(502, 'Could not reach the AI service. Check AI_SERVICE_URL.');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(502, `AI service error (${response.status}): ${text || 'unknown error'}`);
  }

  const result = (await response.json()) as GenerateQuestionsResponse;
  if (!result.questions || result.questions.length === 0) {
    throw new ApiError(422, 'The AI service returned no questions for this document.');
  }
  return result.questions;
}

interface GradeShortAnswerRequest {
  questionText: string;
  expectedAnswer: string;
  keyConcepts?: string[];
  studentAnswer: string;
  marks: number;
}

interface GradeShortAnswerResponse {
  isCorrect: boolean;
  marksAwarded: number;
  feedback: string;
}

export async function gradeShortAnswer(
  req: GradeShortAnswerRequest
): Promise<GradeShortAnswerResponse> {
  return callAiJson<GradeShortAnswerResponse>('/grade-short-answer', req);
}

