import type { IModels } from "../models.ts";

/**
 * Fictional demo roster. Every person, school and zone here is invented for the
 * Hack Day demonstration. No real student data exists anywhere in this project.
 *
 * `principalId` values are the ids the plugin will see in the gateway context:
 *   staff → erxes team member `_id`; cp → erxes Client Portal user `_id`.
 * In dev-direct mode the web BFF uses these ids verbatim. At a real erxes host,
 * pass a map file (see scripts/seed.ts) with the real ids or e-mails instead.
 */
export const DEMO_TENANT = process.env.HAPPY2HELP_TENANT || "localhost";

export interface DemoPerson {
  key: string;
  principalType: "staff" | "cp";
  principalId: string;
  email?: string;
  role: "STUDENT" | "TEACHER";
  displayName: string;
  classLabel?: string;
  title?: string;
  supportKind?: "TEACHER" | "DUTY_TEACHER" | "NURSE" | "SOCIAL_WORKER" | "PSYCHOLOGIST";
  roles?: Array<"COUNCIL_MEMBER" | "COUNCIL_MODERATOR" | "PATROL_STUDENT" | "PATROL_SUPERVISOR" | "NURSE" | "SOCIAL_WORKER" | "SAFEGUARDING_LEAD">;
  school: string;
}

export const DEMO_SCHOOLS = [
  { code: "narlag", nameMn: "Нарлаг Ирээдүй сургууль (DEMO)" },
  { code: "gerelt", nameMn: "Гэрэлт Зам сургууль (DEMO)" },
] as const;

export interface DemoZone { nameMn: string; floor: number; x: number; y: number; w: number; h: number; kind: string }
/** DEMO — зохиомол сургуулийн зураг. Geometry is percent of a 100×56 canvas; floor 0 = outdoors. */
export const DEMO_ZONES: Record<string, DemoZone[]> = {
  narlag: [
    // 1-р давхар
    { nameMn: "101-р анги", floor: 1, x: 4, y: 4, w: 20, h: 18, kind: "classroom" },
    { nameMn: "102-р анги", floor: 1, x: 26, y: 4, w: 20, h: 18, kind: "classroom" },
    { nameMn: "Номын сан", floor: 1, x: 48, y: 4, w: 22, h: 18, kind: "library" },
    { nameMn: "Эмчийн өрөө", floor: 1, x: 72, y: 4, w: 24, h: 18, kind: "nurse" },
    { nameMn: "1-р давхрын коридор", floor: 1, x: 4, y: 24, w: 92, h: 10, kind: "corridor" },
    { nameMn: "Жижүүр багшийн өрөө", floor: 1, x: 4, y: 36, w: 26, h: 16, kind: "office" },
    { nameMn: "Үүдний хэсэг", floor: 1, x: 32, y: 36, w: 36, h: 16, kind: "entrance" },
    { nameMn: "Гарах хаалга", floor: 1, x: 70, y: 36, w: 26, h: 16, kind: "exit" },
    // 2-р давхар
    { nameMn: "201-р анги", floor: 2, x: 4, y: 4, w: 20, h: 18, kind: "classroom" },
    { nameMn: "202-р анги", floor: 2, x: 26, y: 4, w: 20, h: 18, kind: "classroom" },
    { nameMn: "8Б анги", floor: 2, x: 48, y: 4, w: 22, h: 18, kind: "classroom" },
    { nameMn: "Нийгмийн ажилтны өрөө", floor: 2, x: 72, y: 4, w: 24, h: 18, kind: "office" },
    { nameMn: "2-р давхрын коридор", floor: 2, x: 4, y: 24, w: 92, h: 10, kind: "corridor" },
    { nameMn: "Ариун цэврийн өрөөний ойролцоо", floor: 2, x: 4, y: 36, w: 40, h: 16, kind: "toilet" },
    { nameMn: "Шат", floor: 2, x: 80, y: 36, w: 16, h: 16, kind: "stairs" },
    // 3-р давхар
    { nameMn: "301-р анги", floor: 3, x: 4, y: 4, w: 20, h: 18, kind: "classroom" },
    { nameMn: "302-р анги", floor: 3, x: 26, y: 4, w: 20, h: 18, kind: "classroom" },
    { nameMn: "Компьютерийн кабинет", floor: 3, x: 48, y: 4, w: 24, h: 18, kind: "computer" },
    { nameMn: "Лаборатори", floor: 3, x: 74, y: 4, w: 22, h: 18, kind: "lab" },
    { nameMn: "3-р давхрын коридор", floor: 3, x: 4, y: 24, w: 92, h: 10, kind: "corridor" },
    { nameMn: "Шат", floor: 3, x: 80, y: 36, w: 16, h: 16, kind: "stairs" },
    // Гадаа
    { nameMn: "Сургуулийн хашаа", floor: 0, x: 4, y: 4, w: 60, h: 48, kind: "yard" },
    { nameMn: "Спорт талбай", floor: 0, x: 66, y: 4, w: 30, h: 30, kind: "sport" },
    { nameMn: "Хаалга", floor: 0, x: 66, y: 36, w: 30, h: 16, kind: "entrance" },
  ],
  gerelt: [
    { nameMn: "Сургуулийн хашаа", floor: 0, x: 4, y: 4, w: 92, h: 48, kind: "yard" },
    { nameMn: "Анги", floor: 1, x: 4, y: 4, w: 30, h: 18, kind: "classroom" },
    { nameMn: "Коридор", floor: 1, x: 4, y: 24, w: 92, h: 14, kind: "corridor" },
    { nameMn: "Спорт заал", floor: 1, x: 4, y: 40, w: 40, h: 14, kind: "gym" },
    { nameMn: "Бусад газар", floor: 1, x: 36, y: 4, w: 60, h: 18, kind: "other" },
  ],
};

export const DEMO_PEOPLE: DemoPerson[] = [
  { key: "temuulen", principalType: "cp", principalId: "cp-demo-temuulen", email: "temuulen@demo.happy2help.test", role: "STUDENT", displayName: "Тэмүүлэн", classLabel: "8Б", roles: ["PATROL_STUDENT"], school: "narlag" },
  { key: "nomin", principalType: "cp", principalId: "cp-demo-nomin", email: "nomin@demo.happy2help.test", role: "STUDENT", displayName: "Номин", classLabel: "7б", roles: ["COUNCIL_MEMBER"], school: "narlag" },
  { key: "anu", principalType: "cp", principalId: "cp-demo-anu", email: "anu@demo.happy2help.test", role: "STUDENT", displayName: "Ану", classLabel: "11а", roles: ["COUNCIL_MEMBER"], school: "narlag" },
  { key: "togoldor", principalType: "cp", principalId: "cp-demo-togoldor", email: "togoldor@demo.happy2help.test", role: "STUDENT", displayName: "Төгөлдөр", classLabel: "10а", roles: ["PATROL_STUDENT"], school: "narlag" },
  { key: "oyunaa", principalType: "staff", principalId: "staff-demo-oyunaa", email: "oyunaa@demo.happy2help.test", role: "TEACHER", displayName: "Уянга багш", title: "Математикийн багш · өнөөдрийн жижүүр багш", supportKind: "DUTY_TEACHER", school: "narlag" },
  { key: "bat", principalType: "staff", principalId: "staff-demo-bat", email: "bat@demo.happy2help.test", role: "TEACHER", displayName: "Бат багш", title: "Нийгмийн ухааны багш · хүүхэд хамгааллын ажилтан", supportKind: "TEACHER", roles: ["COUNCIL_MODERATOR", "SAFEGUARDING_LEAD"], school: "narlag" },
  { key: "ganbaatar", principalType: "staff", principalId: "staff-demo-ganbaatar", email: "ganbaatar@demo.happy2help.test", role: "TEACHER", displayName: "Ганбаатар багш", title: "Биеийн тамирын багш · эргүүлийн ахлагч", supportKind: "TEACHER", roles: ["PATROL_SUPERVISOR"], school: "narlag" },
  { key: "tsetseg", principalType: "staff", principalId: "staff-demo-tsetseg", email: "tsetseg@demo.happy2help.test", role: "TEACHER", displayName: "Мөнхзул эмч", title: "Сургуулийн сувилагч", supportKind: "NURSE", roles: ["NURSE"], school: "narlag" },
  { key: "uyanga", principalType: "staff", principalId: "staff-demo-uyanga", email: "uyanga@demo.happy2help.test", role: "TEACHER", displayName: "Ариунаа", title: "Нийгмийн ажилтан", supportKind: "SOCIAL_WORKER", roles: ["SOCIAL_WORKER"], school: "narlag" },
  { key: "ariunaa", principalType: "staff", principalId: "staff-demo-ariunaa", email: "ariunaa@demo.happy2help.test", role: "TEACHER", displayName: "Сарнай", title: "Сэтгэл зүйч", supportKind: "PSYCHOLOGIST", school: "narlag" },
  // Second fictional school: proves cross-school isolation.
  { key: "ikhbayar", principalType: "cp", principalId: "cp-demo-ikhbayar", email: "ikhbayar@demo.happy2help.test", role: "STUDENT", displayName: "Ихбаяр", classLabel: "10б", school: "gerelt" },
  { key: "saraa", principalType: "staff", principalId: "staff-demo-saraa", email: "saraa@demo.happy2help.test", role: "TEACHER", displayName: "Сараа багш", title: "Англи хэлний багш", supportKind: "DUTY_TEACHER", school: "gerelt" },
];

/** Optional overrides: { "<key>": { "principalId": "<real erxes id>", "email": "<real e-mail>" } } */
export type SeedMap = Record<string, { principalId?: string; email?: string }>;

export async function applyDemoSeed(models: IModels, tenantId: string, map: SeedMap = {}) {
  const schoolIds: Record<string, string> = {};
  for (const school of DEMO_SCHOOLS) {
    const doc = await models.Schools.findOneAndUpdate(
      { tenantId, code: school.code },
      { $setOnInsert: { tenantId, code: school.code, nameMn: school.nameMn, createdAt: new Date() } },
      { upsert: true, new: true },
    );
    schoolIds[school.code] = String(doc!._id);
    const zones = DEMO_ZONES[school.code] ?? [];
    const keep: string[] = [];
    for (const [index, z] of zones.entries()) {
      // Keyed by name + floor ("Шат" exists on several floors). Ids stay stable across re-seeds.
      const doc = await models.Zones.findOneAndUpdate(
        { tenantId, schoolId: schoolIds[school.code], nameMn: z.nameMn, $or: [{ floor: z.floor }, { floor: { $exists: false } }] },
        { $setOnInsert: { tenantId, schoolId: schoolIds[school.code], nameMn: z.nameMn }, $set: { sortOrder: index, isActive: true, floor: z.floor, x: z.x, y: z.y, w: z.w, h: z.h, kind: z.kind } },
        { upsert: true, new: true },
      );
      keep.push(String(doc!._id));
    }
    // Zones from an older layout are deactivated, never deleted: past incidents still resolve their location.
    await models.Zones.updateMany({ tenantId, schoolId: schoolIds[school.code], _id: { $nin: keep } }, { $set: { isActive: false } });
  }

  for (const person of DEMO_PEOPLE) {
    const override = map[person.key] ?? {};
    const principalId = override.principalId ?? person.principalId;
    const email = (override.email ?? person.email)?.toLowerCase();
    const schoolId = schoolIds[person.school]!;
    await models.Memberships.findOneAndUpdate(
      { tenantId, principalType: person.principalType, $or: [{ principalId }, ...(email ? [{ email }] : [])] },
      {
        $set: {
          tenantId, schoolId, principalType: person.principalType, principalId, email,
          role: person.role, displayName: person.displayName, classLabel: person.classLabel, title: person.title, supportKind: person.supportKind, roles: person.roles ?? [], active: true,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  }

  return { tenantId, schoolIds };
}
