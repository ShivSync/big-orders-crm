import type { OmsStore, OmsCustomer, OmsConnectionStatus } from "./types";

const USE_MOCK = !process.env.OMS_API_BASE_URL || process.env.OMS_API_BASE_URL === "mock";

const MOCK_STORES: OmsStore[] = [
  { storeId: "s-001", storeOperationId: "HCM-PMH", storeAlohaId: "353241", storeName: "KFC Phú Mỹ Hưng", storeAddress: "729 Huỳnh Tấn Phát, Q7, TP.HCM", storeMobile: "19006886", region: "B", active: true },
  { storeId: "s-002", storeOperationId: "HCM-TQD", storeAlohaId: "353225", storeName: "KFC Trần Quang Diệu", storeAddress: "55 Trần Quang Diệu, Q3, TP.HCM", storeMobile: "19006886", region: "B", active: true },
  { storeId: "s-003", storeOperationId: "HN-HTK", storeAlohaId: "350101", storeName: "KFC Hàng Trống", storeAddress: "1 Hàng Trống, Hoàn Kiếm, Hà Nội", storeMobile: "19006886", region: "N", active: true },
  { storeId: "s-004", storeOperationId: "HCM-LVS", storeAlohaId: "353242", storeName: "KFC Lê Văn Sỹ", storeAddress: "132 Lê Văn Sỹ, Phú Nhuận, TP.HCM", storeMobile: "19006886", region: "B", active: true },
  { storeId: "s-005", storeOperationId: "DN-THP", storeAlohaId: "355301", storeName: "KFC Thanh Hóa Plaza", storeAddress: "123 Phan Chu Trinh, Thanh Hóa", storeMobile: "19006886", region: "T", active: true },
  { storeId: "s-006", storeOperationId: "HCM-NVL", storeAlohaId: "353250", storeName: "KFC Nguyễn Văn Linh", storeAddress: "88 Nguyễn Văn Linh, Q7, TP.HCM", storeMobile: "19006886", region: "B", active: true },
  { storeId: "s-007", storeOperationId: "HN-CTL", storeAlohaId: "350115", storeName: "KFC Cầu Giấy", storeAddress: "42 Cầu Giấy, Cầu Giấy, Hà Nội", storeMobile: "19006886", region: "N", active: true },
  { storeId: "s-008", storeOperationId: "CT-NB", storeAlohaId: "355401", storeName: "KFC Ninh Bình", storeAddress: "15 Trần Hưng Đạo, Ninh Bình", storeMobile: "19006886", region: "N", active: false },
];

const MOCK_CUSTOMERS: OmsCustomer[] = [
  { id: "26870836-5236-4bab-80fc-20638289fab8", purchaserName: "Nguyễn Thảo Thanh", purchaserPhone: "0988976139", recipientName: "Nguyễn Thảo Thanh", recipientPhone: "0988976139", email: "user@email.com", customerType: "INDIVIDUAL_VN", fullAddress: "330 Trần Hưng Đạo, Phường Nguyễn Cư Trinh, Quận 1, TP.HCM", city: "Thành phố Hồ Chí Minh", district: "Quận 1", ward: "Phường Nguyễn Cư Trinh", orderId: "dfd1c6a2-3b0a-4f53-af64-d844a853aac5", storeAlohaId: "353241" },
  { id: "45984837-608d-41ff-a935-b761917d5270", purchaserName: "Trần Minh Tuấn", purchaserPhone: "0912345678", recipientName: "Trần Minh Tuấn", recipientPhone: "0912345678", email: "tuan.tran@gmail.com", customerType: "INDIVIDUAL_VN", fullAddress: "132 Cộng Hòa, Phường 04, Quận Tân Bình, TP.HCM", city: "Thành phố Hồ Chí Minh", district: "Quận Tân Bình", ward: "Phường 04", orderId: "c30a98e9-6ae5-4e01-a90b-73d7fdee2468", storeAlohaId: "353225" },
  { id: "92c709fa-5976-4314-9990-2ec972f77b08", purchaserName: "Lê Hoàng Anh", purchaserPhone: "0903456789", recipientName: "Lê Hoàng Anh", recipientPhone: "0903456789", email: null, customerType: "INDIVIDUAL_VN", fullAddress: "45 Nguyễn Huệ, Quận 1, TP.HCM", city: "Thành phố Hồ Chí Minh", district: "Quận 1", ward: "Phường Bến Nghé", orderId: "a02bb286-8d47-4f15-a9f1-537f71d37ca0", storeAlohaId: "353241" },
  { id: "4162a2c2-f4c0-4458-ac21-48c4e6052532", purchaserName: "Phạm Thị Mai", purchaserPhone: "0978123456", recipientName: "Phạm Thị Mai", recipientPhone: "0978123456", email: "mai.pham@company.vn", customerType: "BUSINESS_OFFICE", fullAddress: "88 Lý Thường Kiệt, Q10, TP.HCM", city: "Thành phố Hồ Chí Minh", district: "Quận 10", ward: "Phường 14", orderId: "42835ef3-422d-4b76-98e6-b17848e22e8a", storeAlohaId: "353242" },
  { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", purchaserName: "Võ Văn Hùng", purchaserPhone: "0867654321", recipientName: "Võ Văn Hùng", recipientPhone: "0867654321", email: "hung.vo@school.edu.vn", customerType: "BUSINESS_SCHOOL", fullAddress: "200 Điện Biên Phủ, Q3, TP.HCM", city: "Thành phố Hồ Chí Minh", district: "Quận 3", ward: "Phường 7", orderId: "b5c6d7e8-f9a0-1234-bcde-567890abcdef", storeAlohaId: "353225" },
  { id: "b2c3d4e5-f6a7-8901-cdef-234567890abc", purchaserName: "Đặng Quốc Bảo", purchaserPhone: "0945678901", recipientName: "Đặng Quốc Bảo", recipientPhone: "0945678901", email: null, customerType: "INDIVIDUAL_VN", fullAddress: "15 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội", city: "Hà Nội", district: "Hoàn Kiếm", ward: "Phường Cửa Nam", orderId: "c6d7e8f9-a0b1-2345-def0-678901234567", storeAlohaId: "350101" },
  { id: "c3d4e5f6-a7b8-9012-ef01-345678901bcd", purchaserName: "Nguyễn Thị Hồng", purchaserPhone: "0934567890", recipientName: "Nguyễn Thị Hồng", recipientPhone: "0934567890", email: "hong@hotel-luxury.vn", customerType: "BUSINESS_HOTEL", fullAddress: "5 Nguyễn An Ninh, Q1, TP.HCM", city: "Thành phố Hồ Chí Minh", district: "Quận 1", ward: "Phường Bến Thành", orderId: "d7e8f9a0-b1c2-3456-0123-789012345678", storeAlohaId: "353241" },
  { id: "d4e5f6a7-b8c9-0123-1234-456789012cde", purchaserName: "Hoàng Văn Nam", purchaserPhone: "0823456789", recipientName: "Hoàng Văn Nam", recipientPhone: "0823456789", email: "nam.hoang@gmail.com", customerType: "INDIVIDUAL_VN", fullAddress: "78 Láng Hạ, Đống Đa, Hà Nội", city: "Hà Nội", district: "Đống Đa", ward: "Phường Láng Hạ", orderId: "e8f9a0b1-c2d3-4567-2345-890123456789", storeAlohaId: "350115" },
  { id: "e5f6a7b8-c9d0-1234-3456-567890123def", purchaserName: "Trường THPT Nguyễn Du", purchaserPhone: "0289876543", recipientName: "Cô Lan", recipientPhone: "0918765432", email: "nguyendu.school@edu.vn", customerType: "BUSINESS_SCHOOL", fullAddress: "400 Hai Bà Trưng, Q3, TP.HCM", city: "Thành phố Hồ Chí Minh", district: "Quận 3", ward: "Phường 8", orderId: "f9a0b1c2-d3e4-5678-4567-901234567890", storeAlohaId: "353242" },
  { id: "f6a7b8c9-d0e1-2345-5678-678901234abc", purchaserName: "Công ty TNHH ABC", purchaserPhone: "0287654321", recipientName: "Anh Tuấn", recipientPhone: "0901234567", email: "order@abc-company.vn", customerType: "BUSINESS_OFFICE", fullAddress: "123 Nguyễn Văn Linh, Q7, TP.HCM", city: "Thành phố Hồ Chí Minh", district: "Quận 7", ward: "Phường Tân Phong", orderId: "0a1b2c3d-e4f5-6789-6789-012345678901", storeAlohaId: "353250" },
];

export async function fetchOmsStores(): Promise<OmsStore[]> {
  if (USE_MOCK) return MOCK_STORES;

  const res = await fetch(`${process.env.OMS_API_BASE_URL}/stores`, {
    headers: { Authorization: `Bearer ${process.env.OMS_API_KEY}` },
  });
  if (!res.ok) throw new Error(`OMS store fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchOmsBigOrderCustomers(): Promise<OmsCustomer[]> {
  if (USE_MOCK) return MOCK_CUSTOMERS;

  const res = await fetch(`${process.env.OMS_API_BASE_URL}/big-order/customers`, {
    headers: { Authorization: `Bearer ${process.env.OMS_API_KEY}` },
  });
  if (!res.ok) throw new Error(`OMS customer fetch failed: ${res.status}`);
  return res.json();
}

export async function testOmsConnection(): Promise<OmsConnectionStatus> {
  if (USE_MOCK) return { connected: true, latencyMs: 0, error: "Using mock data — no OMS API configured" };

  const start = Date.now();
  try {
    const res = await fetch(`${process.env.OMS_API_BASE_URL}/health`, {
      headers: { Authorization: `Bearer ${process.env.OMS_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    return { connected: res.ok, latencyMs: Date.now() - start };
  } catch (e) {
    return { connected: false, latencyMs: Date.now() - start, error: (e as Error).message };
  }
}

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-().+]/g, "");
  if (/^84[3-9]\d{8}$/.test(cleaned)) {
    cleaned = "0" + cleaned.slice(2);
  }
  return cleaned;
}

export function mapOmsCustomerType(omsType: string): "parent" | "employee" | "teacher" | "event_organizer" | "other" {
  switch (omsType.toUpperCase()) {
    case "INDIVIDUAL_VN":
    case "INDIVIDUAL_FOREIGNER":
      return "parent";
    case "BUSINESS_SCHOOL":
      return "teacher";
    case "BUSINESS_OFFICE":
    case "BUSINESS_HOTEL":
      return "employee";
    default:
      return "other";
  }
}
