import { createHash } from "crypto";

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";
const MIDTRANS_SIMULATE = process.env.MIDTRANS_SIMULATE === "true";

if (!MIDTRANS_SERVER_KEY && !MIDTRANS_SIMULATE) {
  throw new Error("MIDTRANS_SERVER_KEY is not set");
}

const BASE_URL = MIDTRANS_IS_PRODUCTION
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

const authHeader =
  "Basic " + Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64");

export type MidtransChargeResponse = {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  actions: { name: string; method: string; url: string }[];
};

export type MidtransStatusResponse = {
  status_code: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  transaction_status: string;
  payment_type: string;
  fraud_status?: string;
  signature_key: string;
};

export async function createQrisCharge(params: {
  orderId: string;
  grossAmount: number;
  expiryMinutes?: number;
}): Promise<MidtransChargeResponse> {
  // Simulation mode — return a fake response without calling Midtrans
  if (MIDTRANS_SIMULATE) {
    return {
      status_code: "201",
      status_message: "Success, GoPay transaction is created",
      transaction_id: `SIM-${Date.now()}`,
      order_id: params.orderId,
      gross_amount: String(params.grossAmount) + ".00",
      payment_type: "gopay",
      transaction_time: new Date().toISOString(),
      transaction_status: "pending",
      actions: [
        {
          name: "generate-qr-code",
          method: "GET",
          url: `https://api.sandbox.midtrans.com/v2/gopay/${params.orderId}/qr-code`,
        },
      ],
    };
  }

  const body: Record<string, unknown> = {
    payment_type: "gopay",
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
  };

  const res = await fetch(`${BASE_URL}/v2/charge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok || json.status_code !== "201") {
    console.error("Midtrans charge response:", JSON.stringify(json, null, 2));
    throw new Error(
      `Midtrans charge failed: ${json.status_message || JSON.stringify(json)}`
    );
  }

  return json as MidtransChargeResponse;
}

export async function getTransactionStatus(
  orderId: string
): Promise<MidtransStatusResponse> {
  const res = await fetch(`${BASE_URL}/v2/${orderId}/status`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: authHeader,
    },
  });

  const json = await res.json();
  return json as MidtransStatusResponse;
}

export function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  signatureKey: string
): boolean {
  const payload = orderId + statusCode + grossAmount + serverKey;
  const hash = createHash("sha512").update(payload).digest("hex");
  return hash === signatureKey;
}

export { MIDTRANS_SERVER_KEY, MIDTRANS_SIMULATE };
