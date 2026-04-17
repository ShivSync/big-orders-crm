export type Region = "ALL" | "N" | "T" | "B";
export type UserStatus = "active" | "inactive";
export type FilterStore = "ALL" | "SOME" | "ONE";
export type AccessType = "ALL" | "BY_FILTER";

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: UserStatus;
  is_root: boolean;
  region: Region;
  language_preference: "vi" | "en";
  last_action: string | null;
  oms_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name_en: string;
  name_vi: string;
  slug: string;
  master_slug: string;
  status: "active" | "inactive";
  created_at: string;
}

export interface Permission {
  id: string;
  name_en: string;
  name_vi: string;
  slug: string;
  object_id: string;
  created_at: string;
}

export interface CrmObject {
  id: string;
  name_en: string;
  name_vi: string;
  slug: string;
  created_at: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface RoleObject {
  role_id: string;
  object_id: string;
  is_access: boolean;
  filter_store: FilterStore;
  filter_team: string | null;
  access_type: AccessType;
}

export interface Team {
  id: string;
  name: string;
  region: Region;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  aloha_id: string | null;
  region: Region;
  address: string | null;
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  territory_radius_km: number;
  active: boolean;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface BusinessRule {
  id: string;
  rule_type: string;
  rule_key: string;
  rule_value: Record<string, unknown>;
  applies_to_role: string | null;
  approval_role: string | null;
  name_en: string;
  name_vi: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithRoles extends User {
  roles: Role[];
  teams: Team[];
  stores: Store[];
}
