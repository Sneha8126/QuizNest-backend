import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { registerSchema, loginSchema } from '../utils/validation';
import { signToken } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

export async function register(req: Request, res: Response) {
  const { name, email, password } = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

  const token = signToken({ userId: user._id.toString(), email: user.email });
  res.status(201).json({ token, user });
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken({ userId: user._id.toString(), email: user.email });
  res.json({ token, user });
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  res.json({ user });
}
