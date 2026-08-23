import { Schema, model, Document, Types } from 'mongoose';

export interface IAnswerResult {
  questionId: Types.ObjectId;
  givenAnswer: string | string[] | null;
  isCorrect: boolean;
  marksAwarded: number;
  feedback?: string; // for short-answer grading explanation
}

export interface IAttempt extends Document {
  _id: Types.ObjectId;
  quizId: Types.ObjectId;
  participantId?: Types.ObjectId;
  participantName: string;
  answers: IAnswerResult[];
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  timeTakenSeconds: number;
  passed: boolean;
  submittedAt: Date;
  resultToken: string;
}

const answerResultSchema = new Schema<IAnswerResult>(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    givenAnswer: { type: Schema.Types.Mixed, default: null },
    isCorrect: { type: Boolean, required: true },
    marksAwarded: { type: Number, required: true, default: 0 },
    feedback: { type: String, default: '' },
  },
  { _id: false }
);

const attemptSchema = new Schema<IAttempt>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    participantId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    participantName: { type: String, required: true },
    answers: { type: [answerResultSchema], default: [] },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    incorrectCount: { type: Number, required: true },
    skippedCount: { type: Number, required: true },
    timeTakenSeconds: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    submittedAt: { type: Date, default: () => new Date() },
    resultToken: { type: String, required: true, unique: true, index: true, select: false },
  },
  { timestamps: true }
);

attemptSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.resultToken;
    return ret;
  },
});

export const Attempt = model<IAttempt>('Attempt', attemptSchema);
