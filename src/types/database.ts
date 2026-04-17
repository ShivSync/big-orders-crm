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

// Lead Management Types
export type LeadType = "individual" | "parent" | "school" | "company";
export type LeadSource = "manual" | "event" | "campaign" | "platform" | "web_app" | "company_school" | "google_maps" | "oms_sync";
export type LeadStage = "new" | "contacted" | "qualified" | "converted" | "lost";
export type Gender = "M" | "F" | "Other";
export type ActivityType = "call" | "email" | "meeting" | "note" | "sms" | "system";
export type EntityType = "lead" | "customer" | "opportunity";

export interface Lead {
  id: string;
  full_name: string;
  gender: Gender | null;
  dob: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  ward: string | null;
  district: string | null;
  city: string | null;
  store_id: string | null;
  lead_type: LeadType;
  lead_source: LeadSource;
  stage: LeadStage;
  assigned_to: string | null;
  notes: string | null;
  oms_customer_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LeadWithRelations extends Lead {
  store?: Store | null;
  assigned_user?: Pick<User, "id" | "name" | "email"> | null;
}

export interface Activity {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  activity_type: ActivityType;
  subject: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  creator?: Pick<User, "id" | "name" | "email"> | null;
}

// Customer & Organization Types
export type ContactType = "parent" | "employee" | "teacher" | "event_organizer" | "other";
export type OrganizationType = "company" | "school" | "university" | "hotel" | "club" | "government_office" | "event_venue" | "other";
export type OrgSize = "small" | "medium" | "large" | "enterprise";

export interface IndividualCustomer {
  id: string;
  lead_id: string | null;
  oms_customer_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  contact_type: ContactType;
  gender: Gender | null;
  dob: string | null;
  address: string | null;
  ward: string | null;
  district: string | null;
  city: string | null;
  store_id: string | null;
  total_revenue: number;
  order_count: number;
  last_order_date: string | null;
  consent_given: boolean;
  consent_date: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IndividualCustomerWithRelations extends IndividualCustomer {
  store?: Store | null;
  organizations?: (CustomerOrgLink & { organization?: Organization })[];
}

export interface Organization {
  id: string;
  name_vi: string;
  name_en: string | null;
  tax_id: string | null;
  organization_type: OrganizationType;
  industry: string | null;
  size: OrgSize | null;
  address: string | null;
  ward: string | null;
  district: string | null;
  city: string | null;
  website: string | null;
  main_phone: string | null;
  main_email: string | null;
  store_id: string | null;
  lat: number | null;
  lng: number | null;
  total_revenue: number;
  order_count: number;
  last_order_date: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrganizationWithRelations extends Organization {
  store?: Store | null;
  contacts?: (CustomerOrgLink & { individual?: IndividualCustomer })[];
}

export interface CustomerOrgLink {
  id: string;
  individual_id: string;
  organization_id: string;
  role_title: string | null;
  is_primary_contact: boolean;
  start_date: string | null;
  active: boolean;
  created_at: string;
}

// Pipeline & Opportunity Types
export type OpportunityStage = "new" | "consulting" | "quoted" | "negotiating" | "won" | "lost";

export interface Opportunity {
  id: string;
  lead_id: string | null;
  customer_id: string | null;
  title: string;
  stage: OpportunityStage;
  expected_value: number;
  expected_date: string | null;
  actual_value: number | null;
  lost_reason: string | null;
  assigned_to: string | null;
  notes: string | null;
  order_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OpportunityWithRelations extends Opportunity {
  lead?: Pick<Lead, "id" | "full_name" | "phone"> | null;
  customer?: Pick<IndividualCustomer, "id" | "full_name" | "phone"> | null;
  assigned_user?: Pick<User, "id" | "name" | "email"> | null;
}
