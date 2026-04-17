import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import vi from "@/messages/vi.json";

describe("i18n completeness", () => {
  function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    return Object.entries(obj).flatMap(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "object" && value !== null) {
        return getKeys(value as Record<string, unknown>, fullKey);
      }
      return [fullKey];
    });
  }

  const enKeys = getKeys(en);
  const viKeys = getKeys(vi);

  it("should have the same number of keys in both languages", () => {
    expect(enKeys.length).toBe(viKeys.length);
  });

  it("should have all English keys present in Vietnamese", () => {
    const missingInVi = enKeys.filter((k) => !viKeys.includes(k));
    expect(missingInVi).toEqual([]);
  });

  it("should have all Vietnamese keys present in English", () => {
    const missingInEn = viKeys.filter((k) => !enKeys.includes(k));
    expect(missingInEn).toEqual([]);
  });

  it("should have lead management strings in both languages", () => {
    expect(en).toHaveProperty("leads");
    expect(vi).toHaveProperty("leads");
    expect(Object.keys(en.leads).length).toBeGreaterThan(0);
    expect(Object.keys(en.leads).length).toBe(Object.keys(vi.leads).length);
  });

  it("should have customers section in both languages with matching keys", () => {
    expect(en).toHaveProperty("customers");
    expect(vi).toHaveProperty("customers");
    expect(Object.keys(en.customers).length).toBeGreaterThan(0);
    expect(Object.keys(en.customers).length).toBe(Object.keys(vi.customers).length);
  });

  it("should have organizations section in both languages with matching keys", () => {
    expect(en).toHaveProperty("organizations");
    expect(vi).toHaveProperty("organizations");
    expect(Object.keys(en.organizations).length).toBeGreaterThan(0);
    expect(Object.keys(en.organizations).length).toBe(Object.keys(vi.organizations).length);
  });

  it("should have all contact type labels translated", () => {
    for (const key of ["typeParent", "typeEmployee", "typeTeacher", "typeEventOrganizer", "typeOther"]) {
      expect(en.customers).toHaveProperty(key);
      expect(vi.customers).toHaveProperty(key);
    }
  });

  it("should have all organization type labels translated", () => {
    for (const key of ["typeCompany", "typeSchool", "typeUniversity", "typeHotel", "typeClub", "typeGovernment", "typeEventVenue", "typeOther"]) {
      expect(en.organizations).toHaveProperty(key);
      expect(vi.organizations).toHaveProperty(key);
    }
  });

  it("should have pipeline section in both languages", () => {
    expect(en).toHaveProperty("pipeline");
    expect(vi).toHaveProperty("pipeline");
  });

  it("should have all 6 pipeline stage labels translated", () => {
    for (const key of ["stageNew", "stageConsulting", "stageQuoted", "stageNegotiating", "stageWon", "stageLost"]) {
      expect(en.pipeline).toHaveProperty(key);
      expect(vi.pipeline).toHaveProperty(key);
    }
  });

  it("should have pipeline-specific terms translated", () => {
    for (const key of ["expectedValue", "expectedDate", "actualValue", "lostReason", "pipelineValue", "convertToOrder", "totalPipelineValue", "wonValue"]) {
      expect(en.pipeline).toHaveProperty(key);
      expect(vi.pipeline).toHaveProperty(key);
    }
  });

  it("should have orders section in both languages with matching keys", () => {
    expect(en).toHaveProperty("orders");
    expect(vi).toHaveProperty("orders");
    expect(Object.keys(en.orders).length).toBeGreaterThan(0);
    expect(Object.keys(en.orders).length).toBe(Object.keys(vi.orders).length);
  });

  it("should have menu section in both languages with matching keys", () => {
    expect(en).toHaveProperty("menu");
    expect(vi).toHaveProperty("menu");
    expect(Object.keys(en.menu).length).toBeGreaterThan(0);
    expect(Object.keys(en.menu).length).toBe(Object.keys(vi.menu).length);
  });

  it("should have all 6 order status labels translated", () => {
    for (const key of ["statusDraft", "statusConfirmed", "statusPreparing", "statusReady", "statusFulfilled", "statusCancelled"]) {
      expect(en.orders).toHaveProperty(key);
      expect(vi.orders).toHaveProperty(key);
    }
  });

  it("should have all 5 event type labels translated", () => {
    for (const key of ["eventBirthday", "eventCorporate", "eventSchool", "eventMeeting", "eventCustom"]) {
      expect(en.orders).toHaveProperty(key);
      expect(vi.orders).toHaveProperty(key);
    }
  });

  it("should have all 3 payment status labels translated", () => {
    for (const key of ["paymentUnpaid", "paymentPartial", "paymentPaid"]) {
      expect(en.orders).toHaveProperty(key);
      expect(vi.orders).toHaveProperty(key);
    }
  });

  it("should have all 6 source labels translated", () => {
    for (const key of ["sourceCrm", "sourceLandingPage", "sourcePhone", "sourceZalo", "sourceFacebook", "sourceOmsMigrated"]) {
      expect(en.orders).toHaveProperty(key);
      expect(vi.orders).toHaveProperty(key);
    }
  });

  it("should have no empty string values", () => {
    const emptyEn = enKeys.filter((k) => {
      const parts = k.split(".");
      let val: unknown = en;
      for (const p of parts) val = (val as Record<string, unknown>)[p];
      return val === "";
    });
    expect(emptyEn).toEqual([]);
  });
});
