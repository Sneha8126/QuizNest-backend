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

// ============================================================
// GENERIC AI JSON REQUEST
// ============================================================

async function callAiJson<T>(
  pathname: string,
  body: unknown
): Promise<T> {
  let response: Response;

  try {
    console.log('========== AI JSON REQUEST ==========');
    console.log(
      'AI SERVICE URL:',
      `${env.aiServiceUrl}${pathname}`
    );
    console.log(
      'AI SERVICE API KEY PRESENT:',
      Boolean(env.aiServiceApiKey)
    );
    console.log('=====================================');

    response = await fetch(
      `${env.aiServiceUrl}${pathname}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.aiServiceApiKey
            ? {
                'X-API-Key': env.aiServiceApiKey,
              }
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

  try {
    return (await response.json()) as T;
  } catch (error) {
    console.error(
      '========== AI INVALID JSON RESPONSE =========='
    );
    console.error(error);
    console.error('===============================================');

    throw new ApiError(
      502,
      'AI service returned an invalid JSON response.'
    );
  }
}

// ============================================================
// GENERATE QUESTIONS FROM DOCUMENT
// ============================================================

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

  const aiUrl =
    `${env.aiServiceUrl}/generate-questions`;

  let response: Response;

  try {
    console.log('');
    console.log('========== AI REQUEST ==========');
    console.log(
      'AI SERVICE URL:',
      aiUrl
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
      aiUrl,
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
    console.error('');
    console.error(
      '========== AI CONNECTION ERROR =========='
    );
    console.error(
      'FAILED URL:',
      aiUrl
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
  // AI SERVICE HTTP ERROR
  // ----------------------------------------------------------

  if (!response.ok) {
    const text =
      await response.text().catch(() => '');

    console.error('');
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
      'URL:',
      aiUrl
    );
    console.error(
      'RESPONSE:',
      text
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
  // PARSE RESPONSE
  // ----------------------------------------------------------

  let result: GenerateQuestionsResponse;

  try {
    result =
      (await response.json()) as GenerateQuestionsResponse;
  } catch (error) {
    console.error('');
    console.error(
      '========== AI INVALID JSON RESPONSE =========='
    );
    console.error(error);
    console.error(
      '==============================================='
    );

    throw new ApiError(
      502,
      'AI service returned an invalid JSON response.'
    );
  }

  // ----------------------------------------------------------
  // VALIDATE QUESTIONS
  // ----------------------------------------------------------

  if (
    !result.questions ||
    !Array.isArray(result.questions) ||
    result.questions.length === 0
  ) {
    console.error('');
    console.error(
      '========== AI EMPTY QUESTIONS =========='
    );
    console.error(
      'AI RESPONSE:',
      result
    );
    console.error(
      '========================================'
    );

    throw new ApiError(
      422,
      'The AI service returned no questions for this document.'
    );
  }

  console.log('');
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
}
