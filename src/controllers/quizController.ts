import { Request, Response } from 'express';
import { Quiz } from '../models/Quiz';
import { Attempt } from '../models/Attempt';
import { ApiError } from '../middleware/errorHandler';
import {
  generateQuizSchema,
  updateQuizSchema,
} from '../utils/validation';
import { generateQuestionsFromDocument } from '../services/aiServiceClient';
import { env } from '../config/env';
import { StoredDocument } from '../models/Document';

// ============================================================
// QUIZ GENERATION
// ============================================================

export async function generateQuiz(
  req: Request,
  res: Response
) {
  const body = generateQuizSchema.parse(req.body);

  const document = await StoredDocument.findOne({
    _id: body.documentId,
    ownerId: req.user!.userId,
  });

  if (!document) {
    throw new ApiError(
      404,
      'Uploaded document not found or you do not own it. Upload it again.'
    );
  }

  const questions = await generateQuestionsFromDocument({
    documentBuffer: document.data,
    documentName: document.originalName,
    mimeType: document.mimeType,
    numQuestions: body.settings.numQuestions,
    difficulty: body.settings.difficulty,
    questionType: body.settings.questionType,
  });

  const quiz = await Quiz.create({
    title: body.title,
    description: body.description || '',
    creatorId: req.user!.userId,
    sourceDocument: {
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
    },
    questions,
    settings: body.settings,

    // Published directly because this app is for
    // student preparation and attempting.
    status: 'published',
  });

  // The document is only needed while generating the quiz.
  await document.deleteOne();

  res.status(201).json({ quiz });
}

// ============================================================
// MY QUIZZES
// ============================================================

export async function listMyQuizzes(
  req: Request,
  res: Response
) {
  const quizzes = await Quiz.find({
    creatorId: req.user!.userId,
  }).sort({ createdAt: -1 });

  const withStats = await Promise.all(
    quizzes.map(async (quiz) => {
      const attemptsCount = await Attempt.countDocuments({
        quizId: quiz._id,
      });

      return {
        ...quiz.toJSON(),
        attemptsCount,
      };
    })
  );

  res.json({ quizzes: withStats });
}

// ============================================================
// GET QUIZ
//
// Participants receive a safe quiz without answer keys.
// ============================================================

export async function getQuiz(
  req: Request,
  res: Response
) {
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    throw new ApiError(404, 'Quiz not found');
  }

  if (quiz.status !== 'published') {
    throw new ApiError(
      403,
      'This quiz is not available'
    );
  }

  const safeQuiz = quiz.toJSON() as any;

  safeQuiz.questions = safeQuiz.questions.map(
    (q: any) => ({
      _id: q._id ?? q.id,
      questionText: q.questionText,
      type: q.type,
      options: q.options,
      difficulty: q.difficulty,
      topic: q.topic,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
    })
  );

  return res.json({
    quiz: safeQuiz,
  });
}

// ============================================================
// GET QUIZ FOR ATTEMPT
//
// NEVER sends:
// - correctAnswer
// - expectedAnswer
// - keyConcepts
// - explanation
// ============================================================

export async function getQuizForAttempt(
  req: Request,
  res: Response
) {
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    throw new ApiError(404, 'Quiz not found');
  }

  if (quiz.status !== 'published') {
    throw new ApiError(
      403,
      'This quiz is not available for attempting'
    );
  }

  const safeQuiz = quiz.toJSON() as any;

  safeQuiz.questions = safeQuiz.questions.map(
    (q: any) => ({
      _id: q._id ?? q.id,
      questionText: q.questionText,
      type: q.type,
      options: q.options,
      difficulty: q.difficulty,
      topic: q.topic,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
    })
  );

  return res.json({
    quiz: safeQuiz,
  });
}

// ============================================================
// UPDATE QUIZ
// ============================================================

export async function updateQuiz(
  req: Request,
  res: Response
) {
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    throw new ApiError(404, 'Quiz not found');
  }

  if (
    quiz.creatorId.toString() !==
    req.user!.userId
  ) {
    throw new ApiError(
      403,
      'You do not own this quiz'
    );
  }

  const body = updateQuizSchema.parse(req.body);

  if (body.title !== undefined) {
    quiz.title = body.title;
  }

  if (body.description !== undefined) {
    quiz.description = body.description;
  }

  if (body.settings) {
    Object.assign(quiz.settings, body.settings);
  }

  if (body.questions) {
    quiz.questions = body.questions as any;
  }

  await quiz.save();

  res.json({ quiz });
}

// ============================================================
// DELETE QUIZ
// ============================================================

export async function deleteQuiz(
  req: Request,
  res: Response
) {
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    throw new ApiError(404, 'Quiz not found');
  }

  if (
    quiz.creatorId.toString() !==
    req.user!.userId
  ) {
    throw new ApiError(
      403,
      'You do not own this quiz'
    );
  }

  await quiz.deleteOne();

  res.status(204).send();
}

// ============================================================
// VALIDATE QUESTIONS
// ============================================================

function validateQuestionsForPublish(
  questions: any[]
): string | null {
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const label = `Question ${i + 1}`;

    if (!q?.questionText?.trim()) {
      return `${label} has no question text`;
    }

    if (
      !Number.isFinite(Number(q.marks)) ||
      Number(q.marks) < 1 ||
      Number(q.marks) > 5
    ) {
      return `${label} must have marks between 1 and 5`;
    }

    if (q.type === 'mcq') {
      if (
        !Array.isArray(q.options) ||
        q.options.length !== 4
      ) {
        return `${label} must have exactly 4 options`;
      }

      if (
        typeof q.correctAnswer !== 'string' ||
        !q.options.includes(q.correctAnswer)
      ) {
        return `${label} has an invalid correct answer`;
      }
    } else if (q.type === 'true_false') {
      if (
        JSON.stringify(q.options) !==
        JSON.stringify(['True', 'False'])
      ) {
        return `${label} must use True and False options`;
      }

      if (
        q.correctAnswer !== 'True' &&
        q.correctAnswer !== 'False'
      ) {
        return `${label} has an invalid correct answer`;
      }
    } else if (q.type === 'multiple_correct') {
      if (
        !Array.isArray(q.options) ||
        q.options.length < 4 ||
        q.options.length > 6
      ) {
        return `${label} must have 4 to 6 options`;
      }

      if (
        !Array.isArray(q.correctAnswer) ||
        q.correctAnswer.length < 2 ||
        q.correctAnswer.some(
          (answer: unknown) =>
            !q.options.includes(answer)
        )
      ) {
        return `${label} must have at least 2 valid correct answers`;
      }
    } else if (q.type === 'short_answer') {
      if (!q.expectedAnswer?.trim()) {
        return `${label} needs an expected answer`;
      }
    } else {
      return `${label} has an unsupported question type`;
    }
  }

  return null;
}

// ============================================================
// PUBLISH QUIZ
// ============================================================

export async function publishQuiz(
  req: Request,
  res: Response
) {
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    throw new ApiError(404, 'Quiz not found');
  }

  if (
    quiz.creatorId.toString() !==
    req.user!.userId
  ) {
    throw new ApiError(
      403,
      'You do not own this quiz'
    );
  }

  if (quiz.questions.length === 0) {
    throw new ApiError(
      400,
      'Cannot publish a quiz with no questions'
    );
  }

  const questionError =
    validateQuestionsForPublish(
      quiz.questions
    );

  if (questionError) {
    throw new ApiError(
      400,
      questionError
    );
  }

  quiz.status = 'published';

  await quiz.save();

  res.json({
    quiz,
    shareLink:
      `${env.publicShareBaseUrl}/${quiz.shareCode}`,
  });
}

// ============================================================
// CLOSE QUIZ
// ============================================================

export async function closeQuiz(
  req: Request,
  res: Response
) {
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    throw new ApiError(404, 'Quiz not found');
  }

  if (
    quiz.creatorId.toString() !==
    req.user!.userId
  ) {
    throw new ApiError(
      403,
      'You do not own this quiz'
    );
  }

  quiz.status = 'closed';

  await quiz.save();

  res.json({ quiz });
}

// ============================================================
// DUPLICATE QUIZ
// ============================================================

export async function duplicateQuiz(
  req: Request,
  res: Response
) {
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    throw new ApiError(404, 'Quiz not found');
  }

  if (
    quiz.creatorId.toString() !==
    req.user!.userId
  ) {
    throw new ApiError(
      403,
      'You do not own this quiz'
    );
  }

  const copy = await Quiz.create({
    title: `${quiz.title} (Copy)`,
    description: quiz.description,
    creatorId: quiz.creatorId,
    sourceDocument: quiz.sourceDocument,
    questions: quiz.questions,
    settings: quiz.settings,
    status: 'draft',
  });

  res.status(201).json({
    quiz: copy,
  });
}

// ============================================================
// GENERATE PRACTICE QUIZ
//
// Creates targeted practice from the student's weak topics.
// ============================================================

export async function generatePracticeQuiz(
  req: Request,
  res: Response
) {
  const topics: string[] =
    Array.isArray(req.body.topics)
      ? req.body.topics
      : [];

  if (topics.length === 0) {
    throw new ApiError(
      400,
      'Provide at least one weak topic to practice'
    );
  }

  const attempts = await Attempt.find({
    participantId: req.user!.userId,
  });

  const quizIds = [
    ...new Set(
      attempts.map((a) =>
        a.quizId.toString()
      )
    ),
  ];

  const quizzes = await Quiz.find({
    _id: {
      $in: quizIds,
    },
  });

  const topicSet = new Set(
    topics.map((t) =>
      t.toLowerCase()
    )
  );

  const pool = quizzes.flatMap((q) =>
    q.questions.filter((question) =>
      topicSet.has(
        (
          question.topic ||
          'General'
        ).toLowerCase()
      )
    )
  );

  if (pool.length === 0) {
    throw new ApiError(
      404,
      'No questions found for the selected topics yet'
    );
  }

  const shuffled = [...pool]
    .sort(() => Math.random() - 0.5)
    .slice(0, 15);

  const practiceQuiz = await Quiz.create({
    title: `Practice: ${topics.join(', ')}`,
    description:
      'Targeted practice quiz generated from your weak topics.',
    creatorId: req.user!.userId,
    questions: shuffled,
    settings: {
      numQuestions: shuffled.length,
      difficulty: 'mixed',
      questionType: 'mixed',
      timeLimitMinutes: null,
      negativeMarking: false,
      passingPercentage: 60,
      shuffleQuestions: true,
      shuffleOptions: true,
    },
    status: 'published',
  });

  res.status(201).json({
    quiz: practiceQuiz,
  });
}

// ============================================================
// GET PUBLIC QUIZ BY SHARE CODE
// ============================================================

export async function getQuizByCode(
  req: Request,
  res: Response
) {
  const quiz = await Quiz.findOne({
    shareCode:
      req.params.code.toUpperCase(),
  });

  if (
    !quiz ||
    quiz.status !== 'published'
  ) {
    throw new ApiError(
      404,
      'No published quiz found for this code'
    );
  }

  // Participants shouldn't see correct answers
  // before attempting.
  const safeQuiz = quiz.toJSON() as any;

  safeQuiz.questions =
    safeQuiz.questions.map(
      (q: any) => ({
        _id: q._id ?? q.id,
        questionText: q.questionText,
        type: q.type,
        options: q.options,
        difficulty: q.difficulty,
        topic: q.topic,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
      })
    );

  res.json({
    quiz: safeQuiz,
  });
}
