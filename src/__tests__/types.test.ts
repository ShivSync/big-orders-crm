import { describe, it, expect } from "vitest";
import type {
  Lead, LeadStage, LeadType, LeadSource, Activity, ActivityType,
  User, Store, Role, Region, FilterStore,
  IndividualCustomer, Organization, CustomerOrgLink,
  ContactType, OrganizationType, OrgSize,
  Opportunity, OpportunityStage, OpportunityWithRelations,
} from "@/types/database";

describe("Database types", () => {
  describe("Lead types", () => {
    it("should accept valid lead stages", () => {
      const stages: LeadStage[] = ["new", "contacted", "qualified", "converted", "lost"];
      expect(stages).toHaveLength(5);
    });

    it("should accept valid lead types", () => {
      const types: LeadType[] = ["individual", "parent", "school", "company"];
      expect(types).toHaveLength(4);
    });

    it("should accept valid lead sources", () => {
      const sources: LeadSource[] = [
        "manual", "event", "campaign", "platform",
        "web_app", "company_school", "google_maps", "oms_sync",
      ];
      expect(sources).toHaveLength(8);
    });

    it("should construct a valid Lead object", () => {
      const lead: Lead = {
        id: "test-uuid",
        full_name: "Nguyen Van A",
        gender: "M",
        dob: "1990-01-01",
        phone: "+84912345678",
        email: "test@example.com",
        address: "123 Le Loi",
        ward: "Ben Nghe",
        district: "Quan 1",
        city: "Ho Chi Minh City",
        store_id: "KFC-001",
        lead_type: "individual",
        lead_source: "manual",
        stage: "new",
        assigned_to: "user-uuid",
        notes: "Test lead",
        oms_customer_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      expect(lead.full_name).toBe("Nguyen Van A");
      expect(lead.stage).toBe("new");
      expect(lead.deleted_at).toBeNull();
    });
  });

  describe("Activity types", () => {
    it("should accept valid activity types", () => {
      const types: ActivityType[] = ["call", "email", "meeting", "note", "sms", "system"];
      expect(types).toHaveLength(6);
    });

    it("should construct a valid Activity object", () => {
      const activity: Activity = {
        id: "act-uuid",
        entity_type: "lead",
        entity_id: "lead-uuid",
        activity_type: "call",
        subject: "Follow up call",
        description: "Discussed order for 200 pax",
        created_by: "user-uuid",
        created_at: new Date().toISOString(),
      };
      expect(activity.activity_type).toBe("call");
      expect(activity.entity_type).toBe("lead");
    });
  });

  describe("Customer types", () => {
    it("should accept valid contact types", () => {
      const types: ContactType[] = ["parent", "employee", "teacher", "event_organizer", "other"];
      expect(types).toHaveLength(5);
    });

    it("should construct a valid IndividualCustomer object", () => {
      const customer: IndividualCustomer = {
        id: "cust-uuid",
        lead_id: "lead-uuid",
        oms_customer_id: null,
        full_name: "Tran Thi B",
        phone: "+84912345678",
        email: "tran@example.com",
        contact_type: "parent",
        gender: "F",
        dob: "1985-06-15",
        address: "456 Nguyen Hue",
        ward: "Ben Nghe",
        district: "Quan 1",
        city: "Ho Chi Minh City",
        store_id: "KFC-001",
        total_revenue: 5000000,
        order_count: 3,
        last_order_date: new Date().toISOString(),
        consent_given: true,
        consent_date: new Date().toISOString(),
        tags: ["vip"],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      expect(customer.full_name).toBe("Tran Thi B");
      expect(customer.consent_given).toBe(true);
      expect(customer.consent_date).toBeTruthy();
    });
  });

  describe("Organization types", () => {
    it("should accept valid organization types", () => {
      const types: OrganizationType[] = [
        "company", "school", "university", "hotel",
        "club", "government_office", "event_venue", "other",
      ];
      expect(types).toHaveLength(8);
    });

    it("should accept valid org sizes", () => {
      const sizes: OrgSize[] = ["small", "medium", "large", "enterprise"];
      expect(sizes).toHaveLength(4);
    });

    it("should construct a valid Organization with bilingual names", () => {
      const org: Organization = {
        id: "org-uuid",
        name_vi: "Trường THPT Nguyễn Huệ",
        name_en: "Nguyen Hue High School",
        tax_id: "0123456789",
        organization_type: "school",
        industry: "education",
        size: "large",
        address: "789 Le Loi",
        ward: "Ben Nghe",
        district: "Quan 1",
        city: "Ho Chi Minh City",
        website: "https://nguyenhue.edu.vn",
        main_phone: "+84281234567",
        main_email: "info@nguyenhue.edu.vn",
        store_id: "KFC-001",
        lat: 10.7730,
        lng: 106.7020,
        total_revenue: 25000000,
        order_count: 12,
        last_order_date: new Date().toISOString(),
        tags: ["education", "recurring"],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      expect(org.name_vi).toBeTruthy();
      expect(org.name_en).toBeTruthy();
    });
  });

  describe("CustomerOrgLink types", () => {
    it("should construct a valid link with role_title and is_primary_contact", () => {
      const link: CustomerOrgLink = {
        id: "link-uuid",
        individual_id: "cust-uuid",
        organization_id: "org-uuid",
        role_title: "Head Teacher",
        is_primary_contact: true,
        start_date: "2025-09-01",
        active: true,
        created_at: new Date().toISOString(),
      };
      expect(link.role_title).toBe("Head Teacher");
      expect(link.is_primary_contact).toBe(true);
    });
  });

  describe("Opportunity types", () => {
    it("should accept valid opportunity stages", () => {
      const stages: OpportunityStage[] = ["new", "consulting", "quoted", "negotiating", "won", "lost"];
      expect(stages).toHaveLength(6);
    });

    it("should construct a valid Opportunity object", () => {
      const opp: Opportunity = {
        id: "opp-uuid",
        lead_id: "lead-uuid",
        customer_id: null,
        title: "KFC Party Order - ABC School",
        stage: "consulting",
        expected_value: 15000000,
        expected_date: "2026-06-15",
        actual_value: null,
        lost_reason: null,
        assigned_to: "user-uuid",
        notes: "Large party order for 200 students",
        order_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      expect(opp.title).toBe("KFC Party Order - ABC School");
      expect(opp.stage).toBe("consulting");
      expect(opp.expected_value).toBe(15000000);
    });

    it("should construct Opportunity with won data", () => {
      const opp: Opportunity = {
        id: "opp-uuid",
        lead_id: null,
        customer_id: "cust-uuid",
        title: "Won deal",
        stage: "won",
        expected_value: 10000000,
        expected_date: "2026-05-01",
        actual_value: 12000000,
        lost_reason: null,
        assigned_to: null,
        notes: null,
        order_id: "order-uuid",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      expect(opp.actual_value).toBe(12000000);
      expect(opp.order_id).toBe("order-uuid");
    });

    it("should construct Opportunity with lost data", () => {
      const opp: Opportunity = {
        id: "opp-uuid",
        lead_id: "lead-uuid",
        customer_id: null,
        title: "Lost deal",
        stage: "lost",
        expected_value: 5000000,
        expected_date: null,
        actual_value: null,
        lost_reason: "Price too high",
        assigned_to: null,
        notes: null,
        order_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      expect(opp.lost_reason).toBe("Price too high");
    });

    it("should construct OpportunityWithRelations", () => {
      const opp: OpportunityWithRelations = {
        id: "opp-uuid",
        lead_id: "lead-uuid",
        customer_id: "cust-uuid",
        title: "Test deal",
        stage: "negotiating",
        expected_value: 20000000,
        expected_date: null,
        actual_value: null,
        lost_reason: null,
        assigned_to: "user-uuid",
        notes: null,
        order_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        lead: { id: "lead-uuid", full_name: "Test Lead", phone: "0901234567" },
        customer: { id: "cust-uuid", full_name: "Test Customer", phone: "0909876543" },
        assigned_user: { id: "user-uuid", name: "Admin", email: "admin@bigorders.vn" },
      };
      expect(opp.lead?.full_name).toBe("Test Lead");
      expect(opp.customer?.full_name).toBe("Test Customer");
      expect(opp.assigned_user?.name).toBe("Admin");
    });
  });

  describe("RBAC types", () => {
    it("should accept valid regions", () => {
      const regions: Region[] = ["ALL", "N", "T", "B"];
      expect(regions).toHaveLength(4);
    });

    it("should accept valid filter store values", () => {
      const filters: FilterStore[] = ["ALL", "SOME", "ONE"];
      expect(filters).toHaveLength(3);
    });
  });
});
