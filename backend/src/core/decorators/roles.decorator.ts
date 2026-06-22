import { SetMetadata } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Specify which membership roles are allowed to access a route.
 * Roles from schema.prisma: owner_assistant, assistant, doctor, viewer
 */
export const Roles = (...roles: MembershipRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
