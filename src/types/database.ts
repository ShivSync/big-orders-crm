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
export type LeadSource = "manual" | "event" | "campaign" | "platform" | "web_app" | "company_school" | "google_maps" | "oms_sync" | "embed_widget" | "chat_bot" | "zalo" | "facebook" | "phone_call";

// Channel Types
export type ChannelType = "zalo" | "facebook" | "sms" | "email" | "phone";
export type MessageDirection = "inbound" | "outbound";

export interface ChannelMessage {
  id: string;
  channel: ChannelType;
  direction: MessageDirection;
  sender_id: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  lead_id: string | null;
  customer_id: string | null;
  content: string;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
}
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
  lead?: Pick<Lead, "id" | "full_name"> | null;
  customer?: Pick<IndividualCustomer, "id" | "full_name"> | null;
  assigned_user?: Pick<User, "id" | "name"> | null;
}

// Order & Menu Types
export type OrderStatus = "draft" | "confirmed" | "preparing" | "ready" | "fulfilled" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type EventType = "birthday" | "corporate" | "school_event" | "meeting" | "custom";
export type OrderSource = "crm" | "landing_page" | "phone" | "zalo" | "facebook" | "oms_migrated";

export interface MenuCategory {
  id: string;
  name_vi: string;
  name_en: string;
  slug: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  item_code: string;
  pos_name: string | null;
  name_vi: string;
  name_en: string;
  description_vi: string | null;
  description_en: string | null;
  price: number;
  components: string | null;
  min_quantity: number;
  max_quantity: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItemWithCategory extends MenuItem {
  category?: MenuCategory | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  organization_id: string | null;
  opportunity_id: string | null;
  store_id: string;
  contact_name: string;
  contact_phone: string;
  event_type: EventType;
  scheduled_date: string;
  guest_count: number | null;
  subtotal: number;
  discount_pct: number;
  discount_amount: number;
  total_value: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  delivery_notes: string | null;
  assigned_to: string | null;
  approved_by: string | null;
  aloha_bill_id: string | null;
  source: OrderSource;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrderWithRelations extends Order {
  customer?: Pick<IndividualCustomer, "id" | "full_name"> | null;
  organization?: Pick<Organization, "id" | "name_vi" | "name_en"> | null;
  opportunity?: Pick<Opportunity, "id" | "title"> | null;
  store?: Pick<Store, "id" | "name"> | null;
  assigned_user?: Pick<User, "id" | "name"> | null;
  approved_user?: Pick<User, "id" | "name"> | null;
  items?: OrderItem[];
  status_history?: OrderStatusHistory[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_code: string;
  name_vi: string;
  name_en: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  special_requests: string | null;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  notes: string | null;
  created_at: string;
  changer?: Pick<User, "id" | "name"> | null;
}

// Campaign & Event Types
export type CampaignType = "sms" | "email";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";
export type RecipientStatus = "pending" | "sent" | "delivered" | "failed" | "bounced";
export type RecurringEventType = "birthday" | "company_anniversary" | "children_day" | "custom";

export interface SegmentFilters {
  customer_type?: string[];
  city?: string[];
  store_id?: string[];
  min_revenue?: number;
  max_revenue?: number;
  last_order_before?: string;
  last_order_after?: string;
}

export interface Campaign {
  id: string;
  name: string;
  campaign_type: CampaignType;
  segment_filters: SegmentFilters;
  subject: string | null;
  template: string | null;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CampaignWithRelations extends Campaign {
  creator?: Pick<User, "id" | "name" | "email"> | null;
  recipients?: CampaignRecipient[];
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  customer_id: string;
  channel: CampaignType;
  destination: string;
  status: RecipientStatus;
  sent_at: string | null;
  error: string | null;
  created_at: string;
  customer?: Pick<IndividualCustomer, "id" | "full_name" | "phone" | "email"> | null;
}

export interface RecurringEvent {
  id: string;
  customer_id: string;
  event_type: RecurringEventType;
  event_name: string;
  event_date: string;
  reminder_days_before: number;
  last_reminded_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
