"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRfidReader } from "@/hooks/useRfidReader";

type Transaction = {
  id: number;
  tagId: string | null;
  parkingArea: { id: number; name: string };
  entryTime: string;
  exitTime: string | null;
  durationMinutes: number | null;
  amountCents: number | null;
  status: string;
  payment: {
    id: number;
    paymentMethod: string;
    status: string;
    processedAt: string | null;
  } | null;
};

type Receipt = {
  id: number;
  receiptData: {
    receiptNumber: string;
    parkingArea: string;
    entryTime: string;
    exitTime: string | null;
    durationMinutes: number | null;
    amountCents: number | null;
    paymentMethod: string;
    paidAt: string | null;
  };
};

function formatCents(cents: number): string {
  return `Rp ${cents.toLocaleString("id-ID")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function GateExitPage() {
  const { tagId, isReading, reset: resetReader, setManualTagId } = useRfidReader();
  const [manualInput, setManualInput] = useState("");

  const [txn, setTxn] = useState<Transaction | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  // QRIS payment state
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [qrExpiry, setQrExpiry] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-lookup transaction when tag is scanned
  // When a tag is scanned, immediately create an exit request and let attendant handle payment/receipt
  const handleRequest = async () => {
    if (!tagId) return;
    setError("");
    setSuccessMsg("");
    try {
      const res = await apiFetch(`/exit-requests`, {
        method: "POST",
        body: JSON.stringify({ tagId }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg(`Exit request sent — awaiting attendant approval (req #${json.data.id})`);
        resetReader();
      } else {
        setError(json.message || "Failed to create exit request");
      }
    } catch {
      setError("Network error");
    }
  };

  useEffect(() => {
    if (tagId && !successMsg) {
      handleRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagId]);

  const liveDuration =
    txn && txn.status === "Open"
      ? Math.round((Date.now() - new Date(txn.entryTime).getTime()) / 60000)
      : null;

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startPolling = (pId: number) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/payments/${pId}/status`);
        const json = await res.json();
        if (res.ok) {
          const { paymentStatus } = json.data;
          if (paymentStatus === "Completed") {
            stopPolling();
            setQrImageUrl(null);
            const tRes = await apiFetch(`/transactions/${txn?.id}`);
            if (tRes.ok) {
              const tJson = await tRes.json();
              setTxn(tJson.data);
            }
          } else if (paymentStatus === "Failed") {
            stopPolling();
            setQrImageUrl(null);
            setPaymentId(null);
            setError("Payment expired or failed. Please try again.");
          }
        }
      } catch {
        // ignore
      }
    }, 3000);

    setQrExpiry(300);
    timerRef.current = setInterval(() => {
      setQrExpiry((prev) => {
        if (prev <= 1) {
          stopPolling();
          setQrImageUrl(null);
          setPaymentId(null);
          setError("QR code expired. Please create a new payment.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleExit = async () => {
    if (!tagId) return;
    setProcessing(true);
    setError("");

    try {
      const res = await apiFetch("/transactions/rfid-exit", {
        method: "POST",
        body: JSON.stringify({ tagId }),
      });
      const json = await res.json();
      if (res.ok) {
        setTxn(json.data);
      } else {
        setError(json.message || "Failed to process exit");
      }
    } catch {
      setError("Failed to process exit");
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!txn) return;
    setProcessing(true);
    setError("");

    try {
      const pRes = await apiFetch("/payments", {
        method: "POST",
        body: JSON.stringify({ transactionId: txn.id, paymentMethod: "Qris" }),
      });
      const pJson = await pRes.json();
      if (!pRes.ok) {
        setError(pJson.message || "Failed to create payment");
        setProcessing(false);
        return;
      }
      setPaymentId(pJson.data.id);
      setQrImageUrl(pJson.qrImageUrl || "SIMULATE");
      startPolling(pJson.data.id);
    } catch {
      setError("Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!paymentId) return;
    setProcessing(true);
    setError("");

    try {
      const res = await apiFetch(`/payments/${paymentId}/simulate`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        stopPolling();
        setQrImageUrl(null);
        const tRes = await apiFetch(`/transactions/${txn?.id}`);
        if (tRes.ok) {
          const tJson = await tRes.json();
          setTxn(tJson.data);
        }
      } else {
        setError(json.message || "Simulation failed");
      }
    } catch {
      setError("Simulation failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleReceipt = async () => {
    if (!txn || !txn.payment) return;
    setProcessing(true);
    setError("");

    try {
      const res = await apiFetch("/receipts", {
        method: "POST",
        body: JSON.stringify({ transactionId: txn.id, paymentId: txn.payment.id }),
      });
      const json = await res.json();
      if (res.ok) {
        setReceipt(json.data);
      } else {
        setError(json.message || "Failed to generate receipt");
      }
    } catch {
      setError("Failed to generate receipt");
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      setManualTagId(manualInput.trim());
      setManualInput("");
    }
  };

  const handleReset = () => {
    stopPolling();
    resetReader();
    setTxn(null);
    setReceipt(null);
    setQrImageUrl(null);
    setPaymentId(null);
    setQrExpiry(0);
    setError("");
    setManualInput("");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-warning text-dark px-6 py-4 shadow-md">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Gate Exit</h1>
          <p className="text-sm opacity-75">Scan RFID tag to process exit &amp; payment</p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">

          {/* Success message */}
          {successMsg && (
            <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-6 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-lg font-bold text-green-700">{successMsg}</p>
              <button
                onClick={handleReset}
                className="mt-4 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors"
              >
                Scan Next Vehicle
              </button>
            </div>
          )}

          {/* Scanner card */}
          <div
            className={`bg-white rounded-2xl shadow-lg p-6 border-2 transition-colors ${
              isReading ? "border-warning" : tagId ? "border-success" : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold">RFID Scanner</h2>
              {isReading ? (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">Reading...</span>
              ) : tagId ? (
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">Tag Scanned</span>
              ) : (
                <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full">Waiting</span>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-6 text-center min-h-[80px] flex items-center justify-center">
              {tagId ? (
                <span className="text-3xl font-mono font-bold tracking-widest">{tagId}</span>
              ) : (
                <span className="text-gray-400 text-lg">
                  {isReading ? "Reading tag data..." : "Tap a card on the reader"}
                </span>
              )}
            </div>

            {/* Manual input fallback */}
            {!tagId && !txn && !successMsg && (
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Enter tag ID manually"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warning"
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualInput.trim()}
                  className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Set
                </button>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-warning mx-auto" />
              <p className="mt-3 text-gray-500">Looking up transaction...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4 text-center">
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          )}

          {/* Open transaction — process exit */}
          {txn && txn.status === "Open" && !receipt && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-lg mb-4">Transaction #{txn.id}</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Area</dt>
                  <dd className="font-medium">{txn.parkingArea.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Entry Time</dt>
                  <dd className="font-medium">{formatDate(txn.entryTime)}</dd>
                </div>
                {liveDuration !== null && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Duration (so far)</dt>
                    <dd className="font-medium">{formatDuration(liveDuration)}</dd>
                  </div>
                )}
              </dl>
              <button
                onClick={handleExit}
                disabled={processing}
                className="w-full mt-6 bg-warning text-dark py-4 rounded-2xl font-bold text-xl hover:brightness-95 transition disabled:opacity-50"
              >
                {processing ? "Processing..." : "Process Exit"}
              </button>
            </div>
          )}

          {/* Awaiting payment */}
          {txn && txn.status === "AwaitingPayment" && !receipt && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-lg mb-4">Transaction #{txn.id} — Payment</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Area</dt>
                  <dd className="font-medium">{txn.parkingArea.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Entry</dt>
                  <dd className="font-medium">{formatDate(txn.entryTime)}</dd>
                </div>
                {txn.exitTime && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Exit</dt>
                    <dd className="font-medium">{formatDate(txn.exitTime)}</dd>
                  </div>
                )}
                {txn.durationMinutes != null && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Duration</dt>
                    <dd className="font-medium">{formatDuration(txn.durationMinutes)}</dd>
                  </div>
                )}
                {txn.amountCents != null && (
                  <div className="flex justify-between border-t pt-3 mt-3">
                    <dt className="text-gray-500 font-medium">Amount Due</dt>
                    <dd className="text-xl font-bold text-primary">{formatCents(txn.amountCents)}</dd>
                  </div>
                )}
              </dl>

              {/* QR Code Display */}
              {qrImageUrl && (
                <div className="mt-6 p-6 bg-white border-2 border-primary rounded-xl text-center">
                  <p className="font-semibold mb-3">
                    {qrImageUrl === "SIMULATE" ? "Simulated QRIS Payment" : "Scan QR Code to Pay"}
                  </p>
                  {qrImageUrl !== "SIMULATE" ? (
                    <img
                      src={qrImageUrl}
                      alt="QRIS Payment QR Code"
                      className="w-56 h-56 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-56 h-56 mx-auto bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-5xl">📱</p>
                        <p className="text-xs text-gray-500 mt-1">QR Simulation Mode</p>
                      </div>
                    </div>
                  )}
                  <p className={`mt-3 text-sm ${qrExpiry <= 60 ? "text-red-600 font-bold" : "text-gray-500"}`}>
                    Expires in {Math.floor(qrExpiry / 60)}:{String(qrExpiry % 60).padStart(2, "0")}
                  </p>

                  <button
                    onClick={handleSimulatePayment}
                    disabled={processing}
                    className="mt-4 w-full bg-tertiary text-white py-3 rounded-xl font-semibold hover:brightness-95 transition disabled:opacity-50"
                  >
                    {processing ? "Processing..." : "Simulate Successful Payment"}
                  </button>

                  <div className="mt-3 flex items-center justify-center gap-2 text-gray-400 text-xs">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                    Waiting for payment confirmation...
                  </div>
                </div>
              )}

              {/* Generate payment button */}
              {!qrImageUrl && (!txn.payment || txn.payment.status !== "Completed") && (
                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full mt-6 bg-success text-white py-4 rounded-2xl font-bold text-xl hover:brightness-95 transition disabled:opacity-50"
                >
                  {processing ? "Processing..." : "Generate QRIS Payment"}
                </button>
              )}

              {txn.payment?.status === "Completed" && (
                <button
                  onClick={handleReceipt}
                  disabled={processing}
                  className="w-full mt-6 bg-primary text-white py-4 rounded-2xl font-bold text-lg hover:brightness-95 transition disabled:opacity-50"
                >
                  {processing ? "Processing..." : "Generate Receipt"}
                </button>
              )}
            </div>
          )}

          {/* Closed & paid — receipt option */}
          {txn && txn.status === "Closed" && txn.payment?.status === "Completed" && !receipt && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-lg mb-4">Transaction #{txn.id} — Paid</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Area</dt>
                  <dd className="font-medium">{txn.parkingArea.name}</dd>
                </div>
                {txn.exitTime && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Exit</dt>
                    <dd className="font-medium">{formatDate(txn.exitTime)}</dd>
                  </div>
                )}
                {txn.durationMinutes != null && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Duration</dt>
                    <dd className="font-medium">{formatDuration(txn.durationMinutes)}</dd>
                  </div>
                )}
                {txn.amountCents != null && (
                  <div className="flex justify-between border-t pt-3 mt-3">
                    <dt className="text-gray-500">Total Paid</dt>
                    <dd className="text-xl font-bold text-success">{formatCents(txn.amountCents)}</dd>
                  </div>
                )}
              </dl>
              <span className="inline-block mt-4 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                Payment Successful
              </span>
              <button
                onClick={handleReceipt}
                disabled={processing}
                className="w-full mt-4 bg-primary text-white py-4 rounded-2xl font-bold text-lg hover:brightness-95 transition disabled:opacity-50"
              >
                {processing ? "Processing..." : "Generate Receipt"}
              </button>
            </div>
          )}

          {/* Receipt display */}
          {receipt && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-lg mb-4">Receipt {receipt.receiptData.receiptNumber}</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tag ID</dt>
                  <dd className="font-mono font-medium">{tagId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Area</dt>
                  <dd className="font-medium">{receipt.receiptData.parkingArea}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Entry</dt>
                  <dd className="font-medium">{formatDate(receipt.receiptData.entryTime)}</dd>
                </div>
                {receipt.receiptData.exitTime && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Exit</dt>
                    <dd className="font-medium">{formatDate(receipt.receiptData.exitTime)}</dd>
                  </div>
                )}
                {receipt.receiptData.durationMinutes != null && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Duration</dt>
                    <dd className="font-medium">{formatDuration(receipt.receiptData.durationMinutes)}</dd>
                  </div>
                )}
                {receipt.receiptData.amountCents != null && (
                  <div className="flex justify-between border-t pt-3 mt-3">
                    <dt className="text-gray-500">Amount</dt>
                    <dd className="text-lg font-bold">{formatCents(receipt.receiptData.amountCents)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Payment</dt>
                  <dd className="font-medium">{receipt.receiptData.paymentMethod}</dd>
                </div>
                {receipt.receiptData.paidAt && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Paid At</dt>
                    <dd className="font-medium">{formatDate(receipt.receiptData.paidAt)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Reset button */}
          {(txn || receipt || error) && (
            <button
              onClick={handleReset}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Scan Next Vehicle
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
