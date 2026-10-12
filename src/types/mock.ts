/**
 * Raw shapes from the mock JSON Server (subset used for binding).
 * Domain: 1 event_owner ↔ 1 event; 1 sub_user ↔ 1 event assignment.
 */

export interface MockEvent {
  id: string;
  name: string;
  ownerId: string;
  status: "draft" | "published" | "closed";
  isDeleted: boolean;
}

export interface MockEventUser {
  id: string;
  eventId: string;
  userId: string;
  roleId: string;
  status: "active" | "inactive";
  isDeleted: boolean;
}

export interface MockRole {
  id: string;
  eventOwnerId: string;
  name: string;
  description?: string;
  status: string;
  isDeleted: boolean;
}

export interface MockForm {
  id: string;
  eventId: string;
  type: "registration" | "survey";
  status: string;
  isDeleted: boolean;
}

export interface MockSubmission {
  id: string;
  eventId: string;
  formId: string;
  formType: string;
  status: string;
  isDeleted: boolean;
  submittedAt?: string;
}
