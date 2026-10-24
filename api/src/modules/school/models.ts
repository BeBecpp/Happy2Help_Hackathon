import type { Connection, Model } from "mongoose";
import type { IModels } from "../../models.ts";
import {
  membershipSchema,
  schoolSchema,
  zoneSchema,
  type IMembershipDocument,
  type ISchoolDocument,
  type IZoneDocument,
  type PrincipalType,
} from "./definitions.ts";

export type ISchoolModel = Model<ISchoolDocument>;

export interface IZoneModel extends Model<IZoneDocument> {
  activeForSchool(tenantId: string, schoolId: string): Promise<IZoneDocument[]>;
}

export interface IMembershipModel extends Model<IMembershipDocument> {
  /** Active membership of a gateway-authenticated principal; binds a seeded row by e-mail on first sight. */
  resolve(
    tenantId: string,
    principalType: PrincipalType,
    principalId: string,
    email?: string,
  ): Promise<IMembershipDocument | null>;
}

export const loadSchoolModels = (db: Connection, models: IModels) => {
  class Zone {
    public static activeForSchool(tenantId: string, schoolId: string) {
      return models.Zones.find({ tenantId, schoolId, isActive: true })
        .sort({ sortOrder: 1, nameMn: 1 })
        .lean<IZoneDocument[]>();
    }
  }
  zoneSchema.loadClass(Zone);

  class Membership {
    public static async resolve(
      tenantId: string,
      principalType: PrincipalType,
      principalId: string,
      email?: string,
    ) {
      const direct = await models.Memberships.findOne({
        tenantId,
        principalType,
        principalId,
        active: true,
      }).lean<IMembershipDocument>();
      if (direct) return direct;
      if (!email) return null;
      // A seeded membership may know only the e-mail of the real erxes account. Bind it once.
      return models.Memberships.findOneAndUpdate(
        {
          tenantId,
          principalType,
          email: email.toLowerCase(),
          active: true,
          $or: [{ principalId: { $exists: false } }, { principalId: null }, { principalId: "" }],
        },
        { $set: { principalId } },
        { new: true },
      ).lean<IMembershipDocument>();
    }
  }
  membershipSchema.loadClass(Membership);

  models.Schools = db.model<ISchoolDocument, ISchoolModel>("happy2help_schools", schoolSchema);
  models.Zones = db.model<IZoneDocument, IZoneModel>("happy2help_zones", zoneSchema);
  models.Memberships = db.model<IMembershipDocument, IMembershipModel>(
    "happy2help_memberships",
    membershipSchema,
  );
};
