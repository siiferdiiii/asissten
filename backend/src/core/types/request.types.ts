import { MembershipRole, MembershipStatus } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
  sub: string; // userId
  iat?: number;
  exp?: number;
}

export interface ActiveMembership {
  id: string;
  userId: string;
  doctorProfileId: string;
  role: MembershipRole;
  status: MembershipStatus;
}

export interface RequestWithUser extends Request {
  user: { id: string };
  membership?: ActiveMembership;
}
