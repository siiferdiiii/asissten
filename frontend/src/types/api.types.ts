export type MembershipRole = 'owner_assistant' | 'assistant' | 'doctor' | 'viewer';
export type MembershipStatus = 'active' | 'invited' | 'revoked';
export type TripStatus = 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
export type EventType = 'clinic' | 'surgery' | 'meeting' | 'conference' | 'flight' | 'personal';
export type EventStatus = 'tentative' | 'confirmed' | 'cancelled';

export interface UserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  email?: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  specialization: string;
  strNumber: string | null;
  defaultTimezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  doctorProfileId: string;
  role: MembershipRole;
  status: MembershipStatus;
  user?: UserSummary & { email: string };
}

export interface Trip {
  id: string;
  doctorProfileId: string;
  title: string;
  destinationCity: string;
  destinationCountry: string;
  startDate: string; // ISO String or YYYY-MM-DD
  endDate: string; // ISO String or YYYY-MM-DD
  purpose: string | null;
  status: TripStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ScheduleEvent {
  id: string;
  doctorProfileId: string;
  tripId: string | null;
  type: EventType;
  title: string;
  location: string | null;
  startDatetime: string;
  endDatetime: string;
  timezone: string;
  isRecurring: boolean;
  recurrenceRule: string | null;
  status: EventStatus;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    nextCursor?: string | null;
    hasMore?: boolean;
  };
  warnings?: Array<{
    type: string;
    conflictsWith: Array<{
      id: string;
      title: string;
      startDatetime: string;
      endDatetime: string;
    }>;
  }>;
}
