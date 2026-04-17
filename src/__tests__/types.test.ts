import { describe, it, expect } from "vitest";
import type {
  Lead, LeadStage, LeadType, LeadSource, Activity, ActivityType,
  User, Store, Role, Region, FilterStore,
  IndividualCustomer, Organization, CustomerOrgLink,
  ContactType, OrganizationType, OrgSize,
  Opportunity, OpportunityStage, OpportunityWithRelations,
  Order, OrderItem, OrderStatusHistory, OrderWithRelations,
  OrderStatus, PaymentStatus, EventType, OrderSource,
  MenuItem, MenuCategory, MenuItemWithCategory,
  Campaign, CampaignRecipient, RecurringEvent,
  CampaignType, CampaignStatus, RecipientStatus, RecurringEventType,
  SegmentFilters, CampaignWithRelations,
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
        lead: { id: "lead-uuid", full_name: "Test Lead" },
        customer: { id: "cust-uuid", full_name: "Test Customer" },
        assigned_user: { id: "user-uuid", name: "Admin" },
      };
      expect(opp.lead?.full_name).toBe("Test Lead");
      expect(opp.customer?.full_name).toBe("Test Customer");
      expect(opp.assigned_user?.name).toBe("Admin");
    });
  });

  describe("Order types", () => {
    it("should accept valid order statuses", () => {
      const statuses: OrderStatus[] = ["draft", "confirmed", "preparing", "ready", "fulfilled", "cancelled"];
      expect(statuses).toHaveLength(6);
    });

    it("should accept valid payment statuses", () => {
      const statuses: PaymentStatus[] = ["unpaid", "partial", "paid"];
      expect(statuses).toHaveLength(3);
    });

    it("should accept valid event types", () => {
      const types: EventType[] = ["birthday", "corporate", "school_event", "meeting", "custom"];
      expect(types).toHaveLength(5);
    });

    it("should accept valid order sources", () => {
      const sources: OrderSource[] = ["crm", "landing_page", "phone", "zalo", "facebook", "oms_migrated"];
      expect(sources).toHaveLength(6);
    });

    it("should construct a valid Order object", () => {
      const order: Order = {
        id: "order-uuid",
        order_number: "BO-2026-00001",
        customer_id: "cust-uuid",
        organization_id: null,
        opportunity_id: null,
        store_id: "store-uuid",
        contact_name: "Nguyen Van A",
        contact_phone: "+84912345678",
        event_type: "birthday",
        scheduled_date: "2026-06-15",
        guest_count: 50,
        subtotal: 5000000,
        discount_pct: 10,
        discount_amount: 500000,
        total_value: 4500000,
        status: "draft",
        payment_status: "unpaid",
        delivery_notes: "Deliver by 10am",
        assigned_to: "user-uuid",
        approved_by: null,
        aloha_bill_id: null,
        source: "crm",
        notes: "Birthday party for 50 kids",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      expect(order.order_number).toBe("BO-2026-00001");
      expect(order.status).toBe("draft");
      expect(order.total_value).toBe(4500000);
      expect(order.event_type).toBe("birthday");
    });

    it("should construct a valid OrderItem with snapshot fields", () => {
      const item: OrderItem = {
        id: "item-uuid",
        order_id: "order-uuid",
        menu_item_id: "menu-uuid",
        item_code: "CB-001",
        name_vi: "Combo Bò 1 (5 người)",
        name_en: "Beef Combo 1 (5 pax)",
        quantity: 3,
        unit_price: 399000,
        line_total: 1197000,
        special_requests: "Extra sauce",
        created_at: new Date().toISOString(),
      };
      expect(item.item_code).toBe("CB-001");
      expect(item.line_total).toBe(item.quantity * item.unit_price);
      expect(item.name_vi).toBeTruthy();
      expect(item.name_en).toBeTruthy();
    });

    it("should construct a valid OrderStatusHistory", () => {
      const hist: OrderStatusHistory = {
        id: "hist-uuid",
        order_id: "order-uuid",
        from_status: "draft",
        to_status: "confirmed",
        changed_by: "user-uuid",
        notes: null,
        created_at: new Date().toISOString(),
      };
      expect(hist.from_status).toBe("draft");
      expect(hist.to_status).toBe("confirmed");
    });

    it("should construct OrderWithRelations", () => {
      const order: OrderWithRelations = {
        id: "order-uuid",
        order_number: "BO-2026-00002",
        customer_id: "cust-uuid",
        organization_id: "org-uuid",
        opportunity_id: null,
        store_id: "store-uuid",
        contact_name: "Test",
        contact_phone: "0123456789",
        event_type: "corporate",
        scheduled_date: "2026-07-01",
        guest_count: 100,
        subtotal: 20000000,
        discount_pct: 5,
        discount_amount: 1000000,
        total_value: 19000000,
        status: "confirmed",
        payment_status: "partial",
        delivery_notes: null,
        assigned_to: "user-uuid",
        approved_by: "admin-uuid",
        aloha_bill_id: "ALH-12345",
        source: "phone",
        notes: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        customer: { id: "cust-uuid", full_name: "VIP Customer" },
        organization: { id: "org-uuid", name_vi: "Công ty ABC", name_en: "ABC Company" },
        store: { id: "store-uuid", name: "KFC Quan 1" },
        assigned_user: { id: "user-uuid", name: "Sales Rep" },
        approved_user: { id: "admin-uuid", name: "Manager" },
      };
      expect(order.customer?.full_name).toBe("VIP Customer");
      expect(order.organization?.name_en).toBe("ABC Company");
      expect(order.aloha_bill_id).toBe("ALH-12345");
    });
  });

  describe("Menu types", () => {
    it("should construct a valid MenuCategory", () => {
      const cat: MenuCategory = {
        id: "cat-uuid",
        name_vi: "Combo Bò",
        name_en: "Beef Combos",
        slug: "combo_bo",
        sort_order: 1,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(cat.slug).toBe("combo_bo");
    });

    it("should construct a valid MenuItem with item_code and price", () => {
      const item: MenuItem = {
        id: "mi-uuid",
        category_id: "cat-uuid",
        item_code: "CB-001",
        pos_name: "COMBO BO 1",
        name_vi: "Combo Bò 1",
        name_en: "Beef Combo 1",
        description_vi: null,
        description_en: null,
        price: 399000,
        components: "1x Burger + 2x Pepsi",
        min_quantity: 1,
        max_quantity: 9999,
        active: true,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(item.item_code).toBe("CB-001");
      expect(item.price).toBe(399000);
      expect(item.price).toBeGreaterThan(0);
    });

    it("should construct MenuItemWithCategory", () => {
      const item: MenuItemWithCategory = {
        id: "mi-uuid",
        category_id: "cat-uuid",
        item_code: "AL-001",
        pos_name: null,
        name_vi: "Gà Rán 1 Miếng",
        name_en: "Fried Chicken 1pc",
        description_vi: null,
        description_en: null,
        price: 35000,
        components: null,
        min_quantity: 1,
        max_quantity: 9999,
        active: true,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: {
          id: "cat-uuid",
          name_vi: "À La Carte",
          name_en: "À La Carte",
          slug: "alacard",
          sort_order: 3,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
      expect(item.category?.slug).toBe("alacard");
    });
  });

  describe("Campaign types", () => {
    it("should accept valid campaign statuses", () => {
      const statuses: CampaignStatus[] = ["draft", "scheduled", "sending", "sent", "cancelled"];
      expect(statuses).toHaveLength(5);
    });

    it("should accept valid campaign types", () => {
      const types: CampaignType[] = ["sms", "email"];
      expect(types).toHaveLength(2);
    });

    it("should accept valid recipient statuses", () => {
      const statuses: RecipientStatus[] = ["pending", "sent", "delivered", "failed", "bounced"];
      expect(statuses).toHaveLength(5);
    });

    it("should accept valid recurring event types", () => {
      const types: RecurringEventType[] = ["birthday", "company_anniversary", "children_day", "custom"];
      expect(types).toHaveLength(4);
    });

    it("should construct a valid Campaign with segment_filters as jsonb", () => {
      const campaign: Campaign = {
        id: "camp-uuid",
        name: "Birthday Promo Q2",
        campaign_type: "email",
        segment_filters: { customer_type: ["parent"], city: ["Ho Chi Minh City"], min_revenue: 1000000 },
        subject: "Special Birthday Offer!",
        template: "Dear {{customer_name}}, enjoy your birthday at {{store_name}}!",
        status: "draft",
        scheduled_at: null,
        sent_at: null,
        sent_count: 0,
        delivered_count: 0,
        failed_count: 0,
        created_by: "user-uuid",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      expect(campaign.name).toBe("Birthday Promo Q2");
      expect(campaign.campaign_type).toBe("email");
      expect(campaign.segment_filters.customer_type).toContain("parent");
    });

    it("should construct a valid CampaignRecipient with status tracking", () => {
      const recipient: CampaignRecipient = {
        id: "recip-uuid",
        campaign_id: "camp-uuid",
        customer_id: "cust-uuid",
        channel: "email",
        destination: "test@example.com",
        status: "delivered",
        sent_at: new Date().toISOString(),
        error: null,
        created_at: new Date().toISOString(),
      };
      expect(recipient.status).toBe("delivered");
      expect(recipient.destination).toContain("@");
    });

    it("should construct a valid RecurringEvent", () => {
      const event: RecurringEvent = {
        id: "event-uuid",
        customer_id: "cust-uuid",
        event_type: "birthday",
        event_name: "Customer Birthday",
        event_date: "2026-06-15",
        reminder_days_before: 30,
        last_reminded_at: null,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      expect(event.event_type).toBe("birthday");
      expect(event.reminder_days_before).toBe(30);
    });

    it("should construct SegmentFilters with all optional fields", () => {
      const filters: SegmentFilters = {
        customer_type: ["parent", "employee"],
        city: ["Ho Chi Minh City"],
        store_id: ["store-1"],
        min_revenue: 500000,
        max_revenue: 50000000,
        last_order_before: "2026-01-01",
        last_order_after: "2025-06-01",
      };
      expect(filters.customer_type).toHaveLength(2);
      expect(filters.min_revenue).toBe(500000);
    });

    it("should construct CampaignWithRelations", () => {
      const campaign: CampaignWithRelations = {
        id: "camp-uuid",
        name: "Test Campaign",
        campaign_type: "sms",
        segment_filters: {},
        subject: null,
        template: "Hi {{customer_name}}!",
        status: "sent",
        scheduled_at: null,
        sent_at: new Date().toISOString(),
        sent_count: 50,
        delivered_count: 48,
        failed_count: 2,
        created_by: "user-uuid",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        creator: { id: "user-uuid", name: "Marketing Manager", email: "marketing@kfc.vn" },
      };
      expect(campaign.creator?.name).toBe("Marketing Manager");
      expect(campaign.delivered_count).toBe(48);
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
