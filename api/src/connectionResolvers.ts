import type { IMainContext } from "erxes-api-shared/core-types";
import { createGenerateModels } from "erxes-api-shared/utils";
import { loadClasses, type IModels } from "./models.ts";

export type { IModels };

// IMainContext declares `models?: any`; Omit it so resolvers get real types.
export type Context = Omit<IMainContext, "models"> & {
  subdomain: string;
  models: IModels;
};

// createGenerateModels opens the tenant connection (MONGO_URL) and binds the
// models for the request's tenant, so resolvers never touch another tenant's
// collections. Only the running plugin imports this module.
export const generateModels = createGenerateModels<IModels>(loadClasses);
