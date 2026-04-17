import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Sprint 9: Channel Integrations", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260418300000_sprint9_channels.sql"),
    "utf-8"
  );

  describe("channel_messages table", () => {
    it("should create channel_messages table", () => {
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS channel_messages");
    });

    it("should have channel CHECK constraint", () => {
      expect(sql).toContain("channel IN ('zalo', 'facebook', 'sms', 'email', 'phone')");
    });

    it("should have direction CHECK constraint", () => {
      expect(sql).toContain("direction IN ('inbound', 'outbound')");
    });

    it("should have lead_id FK to leads", () => {
      expect(sql).toContain("lead_id uuid REFERENCES leads(id)");
    });

    it("should have customer_id FK to individual_customers", () => {
      expect(sql).toContain("customer_id uuid REFERENCES individual_customers(id)");
    });

    it("should have content column", () => {
      expect(sql).toContain("content text NOT NULL");
    });

    it("should have metadata JSONB column", () => {
      expect(sql).toContain("metadata jsonb DEFAULT '{}'");
    });

    it("should have read boolean column", () => {
      expect(sql).toContain("read boolean DEFAULT false");
    });
  });

  describe("indexes", () => {
    it("should index channel", () => {
      expect(sql).toContain("idx_channel_messages_channel ON channel_messages(channel)");
    });

    it("should index lead_id", () => {
      expect(sql).toContain("idx_channel_messages_lead_id ON channel_messages(lead_id)");
    });

    it("should index customer_id", () => {
      expect(sql).toContain("idx_channel_messages_customer_id ON channel_messages(customer_id)");
    });

    it("should index created_at DESC", () => {
      expect(sql).toContain("idx_channel_messages_created_at ON channel_messages(created_at DESC)");
    });

    it("should have partial index on unread messages", () => {
      expect(sql).toContain("WHERE read = false");
    });
  });

  describe("RLS", () => {
    it("should enable RLS", () => {
      expect(sql).toContain("ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY");
    });

    it("should have select policy requiring channels.view", () => {
      expect(sql).toContain("channel_messages_select");
      expect(sql).toContain("channels.view");
    });

    it("should have insert policy requiring channels.send", () => {
      expect(sql).toContain("channel_messages_insert");
      expect(sql).toContain("channels.send");
    });

    it("should have update policy for marking read", () => {
      expect(sql).toContain("channel_messages_update");
      expect(sql).toContain("read = true");
    });
  });

  describe("Realtime", () => {
    it("should enable Realtime for channel_messages", () => {
      expect(sql).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE channel_messages");
    });
  });

  describe("permissions", () => {
    it("should create channels object", () => {
      expect(sql).toContain("'channels'");
    });

    it("should create channels.view permission", () => {
      expect(sql).toContain("channels.view");
    });

    it("should create channels.send permission", () => {
      expect(sql).toContain("channels.send");
    });

    it("should grant to admin, omni_channel_head, call_center", () => {
      expect(sql).toContain("admin");
      expect(sql).toContain("omni_channel_head");
      expect(sql).toContain("call_center");
    });
  });

  describe("lead_source extension", () => {
    it("should extend lead_source CHECK with zalo, facebook, phone_call", () => {
      expect(sql).toContain("'zalo'");
      expect(sql).toContain("'facebook'");
      expect(sql).toContain("'phone_call'");
    });
  });
});

describe("Sprint 9: Types", () => {
  it("should export ChannelMessage type", async () => {
    const types = await import("@/types/database");
    const msg: import("@/types/database").ChannelMessage = {
      id: "test",
      channel: "zalo",
      direction: "inbound",
      sender_id: null,
      sender_name: null,
      sender_phone: null,
      lead_id: null,
      customer_id: null,
      content: "test",
      metadata: {},
      read: false,
      created_at: "2026-01-01",
    };
    expect(msg.channel).toBe("zalo");
    expect(msg.direction).toBe("inbound");
  });

  it("should export ChannelType union", () => {
    const channels: import("@/types/database").ChannelType[] = ["zalo", "facebook", "sms", "email"];
    expect(channels).toHaveLength(4);
  });

  it("should export MessageDirection union", () => {
    const dirs: import("@/types/database").MessageDirection[] = ["inbound", "outbound"];
    expect(dirs).toHaveLength(2);
  });

  it("should have extended LeadSource with channel sources", () => {
    const sources: import("@/types/database").LeadSource[] = [
      "manual", "event", "campaign", "platform", "web_app",
      "company_school", "google_maps", "oms_sync",
      "embed_widget", "chat_bot", "zalo", "facebook", "phone_call",
    ];
    expect(sources).toHaveLength(13);
  });
});

describe("Sprint 9: i18n", () => {
  it("should have channels section in en.json", async () => {
    const en = (await import("@/messages/en.json")).default;
    expect(en.channels).toBeDefined();
    expect(en.channels.title).toBe("Channels");
    expect(en.channels.zalo).toBe("Zalo OA");
    expect(en.channels.sendSMS).toBe("Send SMS");
    expect(en.channels.sendZNS).toBe("Send ZNS");
  });

  it("should have channels section in vi.json", async () => {
    const vi = (await import("@/messages/vi.json")).default;
    expect(vi.channels).toBeDefined();
    expect(vi.channels.title).toBe("Kênh liên lạc");
    expect(vi.channels.zalo).toBe("Zalo OA");
  });

  it("should have help section in en.json", async () => {
    const en = (await import("@/messages/en.json")).default;
    expect(en.help).toBeDefined();
    expect(en.help.title).toBe("Help & User Guide");
    expect(en.help.gettingStarted).toBeTruthy();
    expect(en.help.tips).toBeDefined();
    expect(en.help.tooltips).toBeDefined();
  });

  it("should have help section in vi.json", async () => {
    const vi = (await import("@/messages/vi.json")).default;
    expect(vi.help).toBeDefined();
    expect(vi.help.title).toBe("Hướng dẫn sử dụng");
    expect(vi.help.gettingStarted).toBeTruthy();
    expect(vi.help.tips).toBeDefined();
    expect(vi.help.tooltips).toBeDefined();
  });

  it("should have nav.channels and nav.help in both languages", async () => {
    const en = (await import("@/messages/en.json")).default;
    const vi = (await import("@/messages/vi.json")).default;
    expect(en.nav.channels).toBe("Channels");
    expect(vi.nav.channels).toBe("Kênh liên lạc");
    expect(en.nav.help).toBe("Help");
    expect(vi.nav.help).toBe("Trợ giúp");
  });

  it("should have new lead source keys in both languages", async () => {
    const en = (await import("@/messages/en.json")).default;
    const vi = (await import("@/messages/vi.json")).default;
    expect(en.leads.sourceZalo).toBe("Zalo");
    expect(en.leads.sourceFacebook).toBe("Facebook");
    expect(en.leads.sourcePhoneCall).toBe("Phone Call");
    expect(vi.leads.sourceZalo).toBe("Zalo");
    expect(vi.leads.sourceFacebook).toBe("Facebook");
    expect(vi.leads.sourcePhoneCall).toBe("Cuộc gọi");
  });
});
