export interface OmsStore {
  storeId: string;
  storeOperationId: string;
  storeAlohaId: string;
  storeName: string;
  storeAddress: string;
  storeMobile: string;
  region: "N" | "T" | "B";
  active: boolean;
}

export interface OmsCustomer {
  id: string;
  purchaserName: string | null;
  purchaserPhone: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  email: string | null;
  customerType: string;
  fullAddress: string | null;
  city: string | null;
  district: string | null;
  ward: string | null;
  orderId: string;
  storeAlohaId?: string;
}

export interface OmsConnectionStatus {
  connected: boolean;
  latencyMs: number;
  error?: string;
}

export interface OmsSyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}
