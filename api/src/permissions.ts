import type { IPermissionConfig } from "erxes-api-shared/core-types";
import { manifest } from "./config.ts";

// Registered so the plugin is visible in erxes' permission settings.
// Authorization in Happy2Help is membership-based (tenant + school + role, see
// modules/access.ts) because Client Portal users (students) cannot hold erxes
// team-member permissions. These actions document the staff-side capabilities.
export const INCIDENTS_READ = "happy2helpIncidentsRead";
export const INCIDENTS_ACKNOWLEDGE = "happy2helpIncidentsAcknowledge";

export const permissions: IPermissionConfig = {
  plugin: manifest.name,
  modules: [
    {
      name: "happy2helpIncidents",
      description: `${manifest.title} student SOS incidents`,
      scopeField: null,
      ownerFields: [],
      scopes: [{ name: "all", description: "Incidents of the schools this teacher is a member of" }],
      actions: [
        { name: INCIDENTS_READ, title: "Read incidents", description: "View student SOS incidents" },
        { name: INCIDENTS_ACKNOWLEDGE, title: "Acknowledge incidents", description: "Acknowledge a student SOS incident" },
      ],
    },
  ],
};
