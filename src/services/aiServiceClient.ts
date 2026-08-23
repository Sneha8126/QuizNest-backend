import { env } from '../config/env';
import { ApiError } from '../middleware/errorHandler';
import { IQuestion } from '../models/Question';

interface GenerateQuestionsRequest {
  documentBuffer: Buffer;
  documentName: string;
  mimeType: string;
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionType:
    | 'mcq'
    | 'true_false'
    | 'multiple_correct'
    | 'short_answer'
    | 'mixed';
}

interface GenerateQuestionsResponse {
  questions: IQuestion[];
}

async function callAiJson<T>(
  pathname: string,
  body: unknown
): Promise<T> {
  let response: Response;

  try {
    console.log('========== AI JSON REQUEST ==========');
    console.log('URL:', `${env.aiServiceUrl}${pathname}`);
    console.log(
      'API KEY PRESENT:',
      Boolean(env.aiServiceApiKey)
    );

    response = await fetch(
      `${env.aiServiceUrl}${pathname}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.aiServiceApiKey
            ? { 'X-API-Key': env.aiServiceApiKey }
            : {}),
        },
        body: JSON.stringify(body),
      }
    );
  } catch (error) {
    console.error(
      '========== AI CONNECTION ERROR =========='
    );
    console.error(error);
    console.error('=========================================');

    throw new ApiError(
      502,
      'Could not reach the AI service. Check AI_SERVICE_URL.'
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');

    console.error(
      '========== AI SERVICE RESPONSE ERROR =========='
    );
    console.error('STATUS:', response.status);
    console.error('STATUS TEXT:', response.statusText);
    console.error('RESPONSE:', text);
    console.error('================================================');

    throw new ApiError(
      502,
      `AI service error (${response.status}): ${
        text || 'unknown error'
      }`
    );
  }

  return (await response.json()) as T;
}

export async function generateQuestionsFromDocument(
  req: GenerateQuestionsRequest
): Promise<IQuestion[]> {
  const form = new FormData();

  const fileBlob = new Blob(
    [new Uint8Array(req.documentBuffer)],
    {
      type: req.mimeType,
    }
  );

  form.append(
    'file',
    fileBlob,
    req.documentName
  );

  form.append(
    'mimeType',
    req.mimeType
  );

  form.append(
    'numQuestions',
    String(req.numQuestions)
  );

  form.append(
    'difficulty',
    req.difficulty
  );

  form.append(
    'questionType',
    req.questionType
  );

  let response: Response;

  try {
    console.log('========== AI REQUEST ==========');
    console.log(
      'AI SERVICE URL:',
      `${env.aiServiceUrl}/generate-questions`
    );
    console.log(
      'AI SERVICE API KEY PRESENT:',
      Boolean(env.aiServiceApiKey)
    );
    console.log(
      'DOCUMENT NAME:',
      req.documentName
    );
    console.log(
      'MIME TYPE:',
      req.mimeType
    );
    console.log(
      'DOCUMENT SIZE:',
      req.documentBuffer.length,
      'bytes'
    );
    console.log(
      'NUMBER OF QUESTIONS:',
      req.numQuestions
    );
    console.log(
      'DIFFICULTY:',
      req.difficulty
    );
    console.log(
      'QUESTION TYPE:',
      req.questionType
    );
    console.log('================================');

    response = await fetch(
      `${env.aiServiceUrl}/generate-questions`,
      {
        method: 'POST',
        headers: env.aiServiceApiKey
          ? {
              'X-API-Key': env.aiServiceApiKey,
            }
          : {},
        body: form,
      }
    );
  } catch (error) {
    console.error(
      '========== AI CONNECTION ERROR =========='
    );
    console.error(
      'URL:',
      `${env.aiServiceUrl}/generate-questions`
    );
    console.error(error);
    console.error('=========================================');

    throw new ApiError(
      502,
      'Could not reach the AI service. Check AI_SERVICE_URL.'
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');

    console.error(
      '========== AI SERVICE RESPONSE ERROR =========='
    );
    console.error(
      'STATUS:',
      response.status
    );
    console.error(
      'STATUS TEXT:',
      response.statusText
    );
    console.error(
      'RESPONSE:',
      text
    );
    console.error(
      'URL:',
      `${env.aiServiceUrl}/generate-questions`
    );
    console.error(
      '================================================'
    );

    throw new ApiError(
      502,
      `AI service error (${response.status}): ${
        text || 'unknown error'
      }`
    );
  }

  let result: GenerateQuestionsResponse;

  try {
    result =
      (await response.json()) as GenerateQuestionsResponse;
  } catch (error) {
    console.error(
      '========== AI INVALID JSON RESPONSE =========='
    );
    console.error(error);
    console.error(
      '==============================================='
    );

    throw new ApiError(
      502,
      'AI service returned an invalid response.'
    );
  }

  if (
    !result.questions ||
    !Array.isArray(result.questions) ||
    result.questions.length === 0
  ) {
    console.error(
      '========== AI EMPTY QUESTIONS =========='
    );
    console.error('AI RESPONSE:', result);
    console.error(
      '========================================'
    );

    throw new ApiError(
      422,
      'The AI service returned no questions for this document.'
    );
  }

  console.log(
    '========== AI SUCCESS =========='
  );
  console.log(
    'QUESTIONS RECEIVED:',
    result.questions.length
  );
  console.log(
    '================================'
  );

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
  return callAiJson<GradeShortAnswerResponse>(
    '/grade-short-answer',
    req
  );
}      Boolean(env.aiServiceApiKey)
    );

    response = await fetch(`${env.aiServiceUrl}${pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.aiServiceApiKey
          ? { 'X-API-Key': env.aiServiceApiKey }
          : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('========== AI CONNECTION ERROR ==========');
    console.error(error);
    console.error('=========================================');

    throw new ApiError(
      502,
      'Could not reach the AI service. Check AI_SERVICE_URL.'
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');

    console.error('========== AI SERVICE RESPONSE ERROR ==========');
    console.error('STATUS:', response.status);
    console.error('RESPONSE:', text);
    console.error('================================================');

    throw new ApiError(
      502,
      `AI service error (${response.status}): ${
        text || 'unknown error'
      }`
    );
  }

  return (await response.json()) as T;
}

/**
 * Generate quiz questions from an uploaded document.
 */
export async function generateQuestionsFromDocument(
  req: GenerateQuestionsRequest
): Promise<IQuestion[]> {
  // ----------------------------------------------------------
  // Create multipart/form-data request
  // ----------------------------------------------------------

  const form = new FormData();

  const fileBlob = new Blob(
    [new Uint8Array(req.documentBuffer)],
    {
      type: req.mimeType,
    }
  );

  form.append(
    'file',
    fileBlob,
    req.documentName
  );

  form.append(
    'mimeType',
    req.mimeType
  );

  form.append(
    'numQuestions',
    String(req.numQuestions)
  );

  form.append(
    'difficulty',
    req.difficulty
  );

  form.append(
    'questionType',
    req.questionType
  );

  // ----------------------------------------------------------
  // Call FastAPI AI service
  // ----------------------------------------------------------

  let response: Response;

  try {
    console.log('========== AI REQUEST ==========');

    console.log(
      'AI SERVICE URL:',
      `${env.aiServiceUrl}/generate-questions`
    );

    console.log(
      'AI SERVICE API KEY PRESENT:',
      Boolean(env.aiServiceApiKey)
    );

    console.log(
      'DOCUMENT NAME:',
      req.documentName
    );

    console.log(
      'MIME TYPE:',
      req.mimeType
    );

    console.log(
      'DOCUMENT SIZE:',
      req.documentBuffer.length,
      'bytes'
    );

    console.log(
      'NUMBER OF QUESTIONS:',
      req.numQuestions
    );

    console.log(
      'DIFFICULTY:',
      req.difficulty
    );

    console.log(
      'QUESTION TYPE:',
      req.questionType
    );

    console.log(
      '================================'
    );

    response = await fetch(
      `${env.aiServiceUrl}/generate-questions`,
      {
        method: 'POST',

        headers: env.aiServiceApiKey
          ? {
              'X-API-Key':
                env.aiServiceApiKey,
            }
          : {},

        body: form,
      }
    );
  } catch (error) {
    console.error(
      '========== AI CONNECTION ERROR =========='
    );

    console.error(
      'Could not reach:',
      `${env.aiServiceUrl}/generate-questions`
    );

    console.error(error);

    console.error(
      '========================================='
    );

    throw new ApiError(
      502,
      'Could not reach the AI service. Check AI_SERVICE_URL.'
    );
  }

  // ----------------------------------------------------------
  // Handle AI service errors
  // ----------------------------------------------------------

  if (!response.ok) {
    const text =
      await response.text().catch(() => '');

    console.error(
      '========== AI SERVICE RESPONSE ERROR =========='
    );

    console.error(
      'STATUS:',
      response.status
    );

    console.error(
      'STATUS TEXT:',
      response.statusText
    );

    console.error(
      'RESPONSE:',
      text
    );

    console.error(
      'URL:',
      `${env.aiServiceUrl}/generate-questions`
    );

    console.error(
      '================================================'
    );

    throw new ApiError(
      502,
      `AI service error (${response.status}): ${
        text || 'unknown error'
      }`
    );
  }

  // ----------------------------------------------------------
  // Parse response
  // ----------------------------------------------------------

  let result: GenerateQuestionsResponse;

  try {
    result =
      (await response.json()) as GenerateQuestionsResponse;
  } catch (error) {
    console.error(
      '========== AI INVALID JSON RESPONSE =========='
    );

    console.error(error);

    console.error(
      '==============================================='
    );

    throw new ApiError(
      502,
      'AI service returned an invalid response.'
    );
  }

  // ----------------------------------------------------------
  // Validate generated questions
  // ----------------------------------------------------------

  if (
    !result.questions ||
    !Array.isArray(result.questions) ||
    result.questions.length === 0
  ) {
    console.error(
      '========== AI EMPTY QUESTIONS =========='
    );

    console.error(
      'AI response:',
      result
    );

    console.error(
      '========================================='
    );

    throw new ApiError(
      422,
      'The AI service returned no questions for this document.'
    );
  }

  console.log(
    '========== AI SUCCESS =========='
  );

  console.log(
    'QUESTIONS RECEIVED:',
    result.questions.length
  );

  console.log(
    '================================'
  );

  return result.questions;
}

// ============================================================
// SHORT ANSWER GRADING
// ============================================================

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
  return callAiJson<GradeShortAnswerResponse>(
    '/grade-short-answer',
    req
  );
}  return (await response.json()) as T;
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

