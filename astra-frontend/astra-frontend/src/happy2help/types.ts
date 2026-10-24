export type Role = "student" | "teacher";
export type IncidentStatus = "SUBMITTED" | "ACKNOWLEDGED";
export type Category = "BULLYING" | "UNSAFE" | "WELLBEING" | "OTHER";

export interface Session {
  userId: string;
  firstName: string;
  role: Role;
  schoolName: string;
}

export interface Zone {
  id: string;
  nameMn: string;
  descriptionMn?: string | null;
  // Optional coordinates for a real school map supplied by the backend.
  mapX?: number | null;
  mapY?: number | null;
}

export interface Incident {
  id: string;
  category: Category;
  description?: string | null;
  zone: Zone;
  status: IncidentStatus;
  createdAt: string;
  acknowledgedAt?: string | null;
}

export interface AiAnalysis {
  state: "PENDING" | "READY" | "FAILED";
  modelId?: string | null;
  summaryMn?: string | null;
  category?: Category | "UNCLEAR" | null;
  safetyIndicators?: Array<{
    labelMn: string;
    evidenceMn: string;
    certainty: "EXPLICIT" | "POSSIBLE";
  }> | null;
  teacherNextStepsMn?: string[] | null;
}

export interface HappyApi {
  listZones(): Promise<Zone[]>;
  createIncident(input: {
    zoneId: string;
    category: Category;
    description?: string;
    clientRequestId: string;
  }): Promise<Incident>;
  myIncidents(): Promise<Incident[]>;
  myIncident(id: string): Promise<Incident>;
  teacherIncidents(): Promise<Incident[]>;
  teacherIncident(id: string): Promise<Incident>;
  acknowledge(id: string): Promise<Incident>;
  incidentAnalysis(id: string): Promise<AiAnalysis | null>;
}

export interface HappyAuth {
  session: Session | null;
  loading: boolean;
  signIn(): Promise<void>;
  signOut?(): Promise<void>;
}
