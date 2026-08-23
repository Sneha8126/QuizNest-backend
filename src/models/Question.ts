import { Schema } from 'mongoose';

export type QuestionType = 'mcq' | 'true_false' | 'multiple_correct' | 'short_answer';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface IQuestion {
  _id?: any;
  questionText: string;
  type: QuestionType;
  options?: string[]; // for mcq / true_false / multiple_correct
  correctAnswer: string | string[]; // single value, or array for multiple_correct
  expectedAnswer?: string; // for short_answer
  keyConcepts?: string[]; // for short_answer grading
  explanation: string;
  difficulty: Difficulty;
  topic?: string;
  marks: number;
  negativeMarks?: number;
}

export const questionSchema = new Schema<IQuestion>(
  {
    questionText: { type: String, required: true },
    type: {
      type: String,
      enum: ['mcq', 'true_false', 'multiple_correct', 'short_answer'],
      required: true,
    },
    options: { type: [String], default: undefined },
    correctAnswer: { type: Schema.Types.Mixed, required: true },
    expectedAnswer: { type: String },
    keyConcepts: { type: [String], default: undefined },
    explanation: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    topic: { type: String, default: 'General' },
    marks: { type: Number, required: true, default: 1 },
    negativeMarks: { type: Number, default: 0 },
  },
  { _id: true }
);
