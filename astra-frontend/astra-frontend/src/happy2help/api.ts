import type { AiAnalysis, HappyApi, Incident, Zone } from "./types";

type HeadersProvider = () =>
  | HeadersInit
  | Promise<HeadersInit>;

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

async function request<T>(
  endpoint: string,
  headersProvider: HeadersProvider,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(await headersProvider()),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Нэвтрэх хугацаа дууссан байна."
        : "Сервертэй холбогдож чадсангүй.",
    );
  }

  const result = (await response.json()) as GraphQLResponse<T>;
  if (result.errors?.length) {
    // Do not expose arbitrary server details or student data in the UI.
    const code = result.errors[0].extensions?.code;
    throw new Error(
      code === "FORBIDDEN"
        ? "Энэ мэдээллийг харах эрх алга."
        : code === "UNAUTHENTICATED"
          ? "Дахин нэвтэрнэ үү."
          : "Хүсэлтийг гүйцэтгэж чадсангүй. Дахин оролдоно уу.",
    );
  }
  if (!result.data) throw new Error("Серверээс хариу ирсэнгүй.");
  return result.data;
}

const incidentFields = `
  id category description status createdAt acknowledgedAt
  zone { id nameMn descriptionMn mapX mapY }
`;

/**
 * Adapter boundary for Claude's erxes plugin.
 * Align operation and field names here with the actual GraphQL schema.
 * Keep authorization in backend resolvers; this client is not a security boundary.
 */
export function createHappyApi(
  endpoint: string,
  headersProvider: HeadersProvider = () => ({}),
): HappyApi {
  return {
    async listZones() {
      const data = await request<{ happy2HelpZones: Zone[] }>(
        endpoint,
        headersProvider,
        `query Zones {
          happy2HelpZones { id nameMn descriptionMn mapX mapY }
        }`,
      );
      return data.happy2HelpZones;
    },

    async createIncident(input) {
      const data = await request<{ happy2HelpCreateIncident: Incident }>(
        endpoint,
        headersProvider,
        `mutation CreateIncident($input: CreateIncidentInput!) {
          happy2HelpCreateIncident(input: $input) { ${incidentFields} }
        }`,
        { input },
      );
      return data.happy2HelpCreateIncident;
    },

    async myIncidents() {
      const data = await request<{ happy2HelpMyIncidents: Incident[] }>(
        endpoint,
        headersProvider,
        `query MyIncidents {
          happy2HelpMyIncidents { ${incidentFields} }
        }`,
      );
      return data.happy2HelpMyIncidents;
    },

    async myIncident(id) {
      const data = await request<{ happy2HelpMyIncident: Incident | null }>(
        endpoint,
        headersProvider,
        `query MyIncident($id: ID!) {
          happy2HelpMyIncident(id: $id) { ${incidentFields} }
        }`,
        { id },
      );
      if (!data.happy2HelpMyIncident)
        throw new Error("Хүсэлт олдсонгүй.");
      return data.happy2HelpMyIncident;
    },

    async teacherIncidents() {
      const data = await request<{
        happy2HelpTeacherIncidents: Incident[];
      }>(
        endpoint,
        headersProvider,
        `query TeacherIncidents {
          happy2HelpTeacherIncidents { ${incidentFields} }
        }`,
      );
      return data.happy2HelpTeacherIncidents;
    },

    async teacherIncident(id) {
      const data = await request<{
        happy2HelpTeacherIncident: Incident | null;
      }>(
        endpoint,
        headersProvider,
        `query TeacherIncident($id: ID!) {
          happy2HelpTeacherIncident(id: $id) { ${incidentFields} }
        }`,
        { id },
      );
      if (!data.happy2HelpTeacherIncident)
        throw new Error("Хүсэлт олдсонгүй.");
      return data.happy2HelpTeacherIncident;
    },

    async acknowledge(id) {
      const data = await request<{
        happy2HelpAcknowledgeIncident: Incident;
      }>(
        endpoint,
        headersProvider,
        `mutation Acknowledge($id: ID!) {
          happy2HelpAcknowledgeIncident(id: $id) {
            ${incidentFields}
          }
        }`,
        { id },
      );
      return data.happy2HelpAcknowledgeIncident;
    },

    async incidentAnalysis(id) {
      const data = await request<{
        happy2HelpIncidentAnalysis: AiAnalysis | null;
      }>(
        endpoint,
        headersProvider,
        `query IncidentAnalysis($id: ID!) {
          happy2HelpIncidentAnalysis(incidentId: $id) {
            state modelId summaryMn category
            safetyIndicators { labelMn evidenceMn certainty }
            teacherNextStepsMn
          }
        }`,
        { id },
      );
      return data.happy2HelpIncidentAnalysis;
    },
  };
}
