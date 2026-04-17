import { describe, it, expect } from "vitest";
import { calculateLeadScore, haversineDistance } from "@/lib/scoring";

describe("Lead Scoring", () => {
  it("scores higher for closer distance", () => {
    const close = calculateLeadScore({ distanceKm: 0.3, category: "school", competitorCount: 0 });
    const far = calculateLeadScore({ distanceKm: 4, category: "school", competitorCount: 0 });
    expect(close).toBeGreaterThan(far);
  });

  it("scores higher for priority categories", () => {
    const school = calculateLeadScore({ distanceKm: 1, category: "school", competitorCount: 0 });
    const restaurant = calculateLeadScore({ distanceKm: 1, category: "restaurant", competitorCount: 0 });
    expect(school).toBeGreaterThan(restaurant);
  });

  it("scores higher for larger organizations", () => {
    const large = calculateLeadScore({ distanceKm: 1, category: "company", estimatedSize: 500, competitorCount: 0 });
    const small = calculateLeadScore({ distanceKm: 1, category: "company", estimatedSize: 10, competitorCount: 0 });
    expect(large).toBeGreaterThan(small);
  });

  it("penalizes for competitor proximity", () => {
    const noComp = calculateLeadScore({ distanceKm: 1, category: "hotel", competitorCount: 0 });
    const withComp = calculateLeadScore({ distanceKm: 1, category: "hotel", competitorCount: 3 });
    expect(noComp).toBeGreaterThan(withComp);
  });

  it("clamps score between 0 and 100", () => {
    const max = calculateLeadScore({ distanceKm: 0.1, category: "school", estimatedSize: 1000, competitorCount: 0 });
    expect(max).toBeLessThanOrEqual(100);
    expect(max).toBeGreaterThanOrEqual(0);
  });

  it("hotel and event_venue score higher than restaurant", () => {
    const hotel = calculateLeadScore({ distanceKm: 1, category: "hotel", competitorCount: 0 });
    const venue = calculateLeadScore({ distanceKm: 1, category: "event_venue", competitorCount: 0 });
    const rest = calculateLeadScore({ distanceKm: 1, category: "restaurant", competitorCount: 0 });
    expect(hotel).toBeGreaterThan(rest);
    expect(venue).toBeGreaterThan(rest);
  });
});

describe("Haversine Distance", () => {
  it("calculates distance between two points in km", () => {
    // Hanoi to HCMC ~1,150 km
    const d = haversineDistance(21.0285, 105.8542, 10.7769, 106.7009);
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1200);
  });

  it("returns 0 for same point", () => {
    const d = haversineDistance(10.7769, 106.7009, 10.7769, 106.7009);
    expect(d).toBe(0);
  });

  it("calculates short distances correctly", () => {
    // Two points ~1km apart in HCMC
    const d = haversineDistance(10.7769, 106.7009, 10.7859, 106.7009);
    expect(d).toBeGreaterThan(0.9);
    expect(d).toBeLessThan(1.1);
  });
});
