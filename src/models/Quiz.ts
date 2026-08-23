import { Schema, model, Document, Types } from 'mongoose';
import { customAlphabet } from 'nanoid';
import { questionSchema, IQuestion } from './Question';

const generateShareCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export type QuizStatus = 'draft' | 'published' | 'closed';

export interface IQuizSettings {
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionType: 'mcq' | 'true_false' | 'multiple_correct' | 'short_answer' | 'mixed';
  timeLimitMinutes: number | null; // null = no limit
  negativeMarking: boolean;
  passingPercentage: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export interface IQuiz extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  creatorId: Types.ObjectId;
  sourceDocument?: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };
  questions: IQuestion[];
  settings: IQuizSettings;
  shareCode: string;
  status: QuizStatus;
  createdAt: Date;
  updatedAt: Date;
}

const quizSettingsSchema = new Schema<IQuizSettings>(
  {
    numQuestions: { type: Number, required: true, default: 10 },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'mixed'],
      default: 'mixed',
    },
    questionType: {
      type: String,
      enum: ['mcq', 'true_false', 'multiple_correct', 'short_answer', 'mixed'],
      default: 'mcq',
    },
    timeLimitMinutes: { type: Number, default: null },
    negativeMarking: { type: Boolean, default: false },
    passingPercentage: { type: Number, default: 60 },
    shuffleQuestions: { type: Boolean, default: true },
    shuffleOptions: { type: Boolean, default: true },
  },
  { _id: false }
);

const quizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '' },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceDocument: {
      originalName: String,
      mimeType: String,
      sizeBytes: Number,
    },
    questions: { type: [questionSchema], default: [] },
    settings: { type: quizSettingsSchema, required: true },
    shareCode: {
      type: String,
      unique: true,
      index: true,
      default: () => generateShareCode(),
    },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft' },
  },
  { timestamps: true }
);

quizSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Quiz = model<IQuiz>('Quiz', quizSchema);
