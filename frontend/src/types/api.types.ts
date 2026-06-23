export type MembershipRole = 'owner_assistant' | 'assistant' | 'doctor' | 'viewer';
export type MembershipStatus = 'active' | 'invited' | 'revoked';
export type TripStatus = 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
export type EventType = 'clinic' | 'surgery' | 'meeting' | 'conference' | 'flight' | 'personal';
export type EventStatus = 'tentative' | 'confirmed' | 'cancelled';
export type HotelBookingStatus = 'searching' | 'booked' | 'confirmed' | 'cancelled';
export type HotelPlatform = 'traveloka' | 'agoda' | 'booking_com' | 'other';
export type PackingCategory = 'clothing' | 'document' | 'medical' | 'electronics' | 'toiletries' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'open' | 'in_progress' | 'done';

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
  doctorProfile?: DoctorProfile;
}

export interface Trip {
  id: string;
  doctorProfileId: string;
  title: string;
  destinationCity: string;
  destinationCountry: string;
  startDate: string;
  endDate: string;
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

export interface Hotel {
  id: string;
  tripId: string;
  name: string;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  checkIn: string;
  checkOut: string;
  bookingStatus: HotelBookingStatus;
  bookingReference: string | null;
  price: number | null;
  currency: string | null;
  platform: HotelPlatform | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PackingItem {
  id: string;
  packingListId: string;
  itemName: string;
  category: PackingCategory;
  qty: number;
  isPacked: boolean;
  updatedAt: string;
}

export interface PackingList {
  id: string;
  tripId: string;
  createdAt: string;
  updatedAt: string;
  items: PackingItem[];
}

export interface Task {
  id: string;
  doctorProfileId: string;
  tripId: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  assignedToId: string | null;
  assignedTo: UserSummary | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdById: string;
  createdBy: UserSummary | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type DocumentEntityType = 'trip' | 'hotel' | 'task' | 'schedule_event';
export type NotificationEntityType = 'trip' | 'hotel' | 'task' | 'packing_item' | 'schedule_event';

export interface Document {
  id: string;
  entityType: DocumentEntityType;
  entityId: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedById: string;
  uploadedBy: UserSummary | null;
  uploadedAt: string;
}

export interface Notification {
  id: string;
  recipientUserId: string;
  title: string;
  body: string;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
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
