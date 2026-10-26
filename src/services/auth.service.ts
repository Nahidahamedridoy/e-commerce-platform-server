import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { generateToken } from '../utils/token';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { Role } from '@prisma/client';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  role?: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  static async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(input.password, saltRounds);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        phone: input.phone,
        address: input.address,
        role: input.role || Role.CUSTOMER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  static async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; address?: string }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}
