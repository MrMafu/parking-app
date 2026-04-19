import { useEffect, useRef, useState } from "react";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  IonBadge,
  IonNote,
} from "@ionic/react";
import { apiFetch } from "../lib/api";
import { useRfidReader } from "../hooks/useRfidReader";

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

export default function RfidExitPage() {
  const { tagId, isReading, reset: resetReader } = useRfidReader();

  const [txn, setTxn] = useState<Transaction | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  // QRIS payment state
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [qrExpiry, setQrExpiry] = useState<number>(0); // seconds remaining
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-lookup transaction when tag is scanned
  useEffect(() => {
    if (!tagId) return;

    const lookup = async () => {
      setLoading(true);
      setError("");
      setTxn(null);
      setReceipt(null);

      try {
        const res = await apiFetch(
          `/transactions/by-tag/${encodeURIComponent(tagId)}`
        );
        const json = await res.json();
        if (res.ok) {
          setTxn(json.data);
        } else {
          setError(json.message || "No active transaction found for this tag");
        }
      } catch {
        setError("Failed to look up transaction");
      } finally {
        setLoading(false);
      }
    };

    lookup();
  }, [tagId]);

  const liveDuration =
    txn && txn.status === "Open"
      ? Math.round((Date.now() - new Date(txn.entryTime).getTime()) / 60000)
      : null;

  // Cleanup polling and timer on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startPolling = (pId: number) => {
    // Poll payment status every 3 seconds
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/payments/${pId}/status`);
        const json = await res.json();
        if (res.ok) {
          const { paymentStatus } = json.data;
          if (paymentStatus === "Completed") {
            stopPolling();
            setQrImageUrl(null);
            // Refresh transaction to get updated state
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
        // Ignore polling errors
      }
    }, 3000);

    // Countdown timer (5 minutes = 300 seconds)
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
      // Create payment — backend creates Midtrans QRIS charge
      const pRes = await apiFetch("/payments", {
        method: "POST",
        body: JSON.stringify({
          transactionId: txn.id,
          paymentMethod: "Qris",
        }),
      });
      const pJson = await pRes.json();
      if (!pRes.ok) {
        setError(pJson.message || "Failed to create payment");
        setProcessing(false);
        return;
      }

      // Show QR code and start polling
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
      const res = await apiFetch(`/payments/${paymentId}/simulate`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        stopPolling();
        setQrImageUrl(null);
        // Refresh transaction
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
        body: JSON.stringify({
          transactionId: txn.id,
          paymentId: txn.payment.id,
        }),
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

  const handleReset = () => {
    stopPolling();
    resetReader();
    setTxn(null);
    setReceipt(null);
    setQrImageUrl(null);
    setPaymentId(null);
    setQrExpiry(0);
    setError("");
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>RFID Exit</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Scanner Status */}
        <IonCard
          style={{
            border: isReading
              ? "2px solid var(--ion-color-warning)"
              : tagId
              ? "2px solid var(--ion-color-success)"
              : "2px solid var(--ion-color-medium)",
            transition: "border-color 0.2s",
          }}
        >
          <IonCardHeader>
            <IonCardTitle
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              RFID Scanner
              {isReading ? (
                <IonBadge color="warning">Reading...</IonBadge>
              ) : tagId ? (
                <IonBadge color="success">Tag Scanned</IonBadge>
              ) : (
                <IonBadge color="medium">Waiting for Scan</IonBadge>
              )}
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div
              style={{
                padding: 20,
                background: "var(--ion-color-light)",
                borderRadius: 8,
                textAlign: "center",
                minHeight: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {tagId ? (
                <span
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    letterSpacing: 2,
                  }}
                >
                  {tagId}
                </span>
              ) : (
                <span style={{ color: "var(--ion-color-medium)" }}>
                  {isReading
                    ? "Reading tag data..."
                    : "Tap a card on the reader to begin"}
                </span>
              )}
            </div>
          </IonCardContent>
        </IonCard>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <IonSpinner name="crescent" />
            <p>Looking up transaction...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <IonCard style={{ border: "2px solid var(--ion-color-danger)" }}>
            <IonCardContent>
              <IonText color="danger">
                <p style={{ fontWeight: 600, margin: 0 }}>{error}</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        )}

        {/* Transaction details (before exit) */}
        {txn && txn.status === "Open" && !receipt && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: 16 }}>
                Transaction #{txn.id}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList lines="none">
                <IonItem>
                  <IonLabel>
                    <p>Area</p>
                    <h3>{txn.parkingArea.name}</h3>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <p>Entry Time</p>
                    <h3>{formatDate(txn.entryTime)}</h3>
                  </IonLabel>
                </IonItem>
                {liveDuration !== null && (
                  <IonItem>
                    <IonLabel>
                      <p>Duration (so far)</p>
                      <h3>{formatDuration(liveDuration)}</h3>
                    </IonLabel>
                  </IonItem>
                )}
              </IonList>

              <IonButton
                expand="block"
                color="warning"
                onClick={handleExit}
                disabled={processing}
                className="ion-margin-top"
              >
                {processing ? (
                  <IonSpinner name="crescent" />
                ) : (
                  "Process Exit"
                )}
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {/* Post-exit: awaiting payment */}
        {txn && txn.status === "AwaitingPayment" && !receipt && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: 16 }}>
                Transaction #{txn.id} — Payment
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList lines="none">
                <IonItem>
                  <IonLabel>
                    <p>Area</p>
                    <h3>{txn.parkingArea.name}</h3>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <p>Entry</p>
                    <h3>{formatDate(txn.entryTime)}</h3>
                  </IonLabel>
                </IonItem>
                {txn.exitTime && (
                  <IonItem>
                    <IonLabel>
                      <p>Exit</p>
                      <h3>{formatDate(txn.exitTime)}</h3>
                    </IonLabel>
                  </IonItem>
                )}
                {txn.durationMinutes != null && (
                  <IonItem>
                    <IonLabel>
                      <p>Duration</p>
                      <h3>{formatDuration(txn.durationMinutes)}</h3>
                    </IonLabel>
                  </IonItem>
                )}
                {txn.amountCents != null && (
                  <IonItem>
                    <IonLabel>
                      <p>Amount Due</p>
                      <h2 style={{ color: "var(--ion-color-primary)" }}>
                        {formatCents(txn.amountCents)}
                      </h2>
                    </IonLabel>
                  </IonItem>
                )}
              </IonList>

              {/* QR Code Display */}
              {qrImageUrl && (
                <div
                  style={{
                    textAlign: "center",
                    margin: "16px 0",
                    padding: 16,
                    background: "#fff",
                    borderRadius: 12,
                    border: "2px solid var(--ion-color-primary)",
                  }}
                >
                  <p style={{ fontWeight: 600, marginBottom: 8, color: "#333" }}>
                    {qrImageUrl === "SIMULATE"
                      ? "Simulated QRIS Payment"
                      : "Scan QR Code to Pay"}
                  </p>
                  {qrImageUrl !== "SIMULATE" ? (
                    <img
                      src={qrImageUrl}
                      alt="QRIS Payment QR Code"
                      style={{
                        width: 220,
                        height: 220,
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 220,
                        height: 220,
                        margin: "0 auto",
                        background: "#f0f0f0",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px dashed var(--ion-color-medium)",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 48, margin: 0 }}>📱</p>
                        <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>
                          QR Simulation Mode
                        </p>
                      </div>
                    </div>
                  )}
                  <p
                    style={{
                      marginTop: 12,
                      fontSize: 14,
                      color:
                        qrExpiry <= 60
                          ? "var(--ion-color-danger)"
                          : "var(--ion-color-medium)",
                      fontWeight: qrExpiry <= 60 ? 700 : 400,
                    }}
                  >
                    Expires in {Math.floor(qrExpiry / 60)}:
                    {String(qrExpiry % 60).padStart(2, "0")}
                  </p>

                  {/* Simulate payment button */}
                  <IonButton
                    expand="block"
                    color="tertiary"
                    onClick={handleSimulatePayment}
                    disabled={processing}
                    style={{ marginTop: 12 }}
                  >
                    {processing ? (
                      <IonSpinner name="crescent" />
                    ) : (
                      "Simulate Successful Payment"
                    )}
                  </IonButton>

                  <IonSpinner
                    name="dots"
                    style={{ marginTop: 8 }}
                  />
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--ion-color-medium)",
                      marginTop: 4,
                    }}
                  >
                    Waiting for payment confirmation...
                  </p>
                </div>
              )}

              {/* Show payment button only if QR not yet displayed */}
              {!qrImageUrl &&
                (!txn.payment || txn.payment.status !== "Completed") && (
                  <IonButton
                    expand="block"
                    color="success"
                    onClick={handlePayment}
                    disabled={processing}
                    className="ion-margin-top"
                  >
                    {processing ? (
                      <IonSpinner name="crescent" />
                    ) : (
                      "Generate QRIS Payment"
                    )}
                  </IonButton>
                )}

              {txn.payment?.status === "Completed" && (
                <IonButton
                  expand="block"
                  onClick={handleReceipt}
                  disabled={processing}
                  className="ion-margin-top"
                >
                  {processing ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    "Generate Receipt"
                  )}
                </IonButton>
              )}
            </IonCardContent>
          </IonCard>
        )}

        {/* Payment completed — show receipt option */}
        {txn && txn.status === "Closed" && txn.payment?.status === "Completed" && !receipt && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: 16 }}>
                Transaction #{txn.id} — Paid
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList lines="none">
                <IonItem>
                  <IonLabel>
                    <p>Area</p>
                    <h3>{txn.parkingArea.name}</h3>
                  </IonLabel>
                </IonItem>
                {txn.exitTime && (
                  <IonItem>
                    <IonLabel>
                      <p>Exit</p>
                      <h3>{formatDate(txn.exitTime)}</h3>
                    </IonLabel>
                  </IonItem>
                )}
                {txn.durationMinutes != null && (
                  <IonItem>
                    <IonLabel>
                      <p>Duration</p>
                      <h3>{formatDuration(txn.durationMinutes)}</h3>
                    </IonLabel>
                  </IonItem>
                )}
                {txn.amountCents != null && (
                  <IonItem>
                    <IonLabel>
                      <p>Total Paid</p>
                      <h2 style={{ color: "var(--ion-color-success)" }}>
                        {formatCents(txn.amountCents)}
                      </h2>
                    </IonLabel>
                  </IonItem>
                )}
              </IonList>

              <IonBadge color="success" style={{ marginBottom: 12 }}>
                Payment Successful
              </IonBadge>

              <IonButton
                expand="block"
                onClick={handleReceipt}
                disabled={processing}
                className="ion-margin-top"
              >
                {processing ? (
                  <IonSpinner name="crescent" />
                ) : (
                  "Generate Receipt"
                )}
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {/* Receipt display */}
        {receipt && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: 16 }}>
                Receipt {receipt.receiptData.receiptNumber}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList lines="none">
                <IonItem>
                  <IonLabel>
                    <p>Tag ID</p>
                    <h3 style={{ fontFamily: "monospace" }}>{tagId}</h3>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <p>Area</p>
                    <h3>{receipt.receiptData.parkingArea}</h3>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <p>Entry</p>
                    <h3>{formatDate(receipt.receiptData.entryTime)}</h3>
                  </IonLabel>
                </IonItem>
                {receipt.receiptData.exitTime && (
                  <IonItem>
                    <IonLabel>
                      <p>Exit</p>
                      <h3>{formatDate(receipt.receiptData.exitTime)}</h3>
                    </IonLabel>
                  </IonItem>
                )}
                {receipt.receiptData.durationMinutes != null && (
                  <IonItem>
                    <IonLabel>
                      <p>Duration</p>
                      <h3>
                        {formatDuration(receipt.receiptData.durationMinutes)}
                      </h3>
                    </IonLabel>
                  </IonItem>
                )}
                {receipt.receiptData.amountCents != null && (
                  <IonItem>
                    <IonLabel>
                      <p>Total Paid</p>
                      <h2 style={{ color: "var(--ion-color-success)" }}>
                        {formatCents(receipt.receiptData.amountCents)}
                      </h2>
                    </IonLabel>
                  </IonItem>
                )}
                <IonItem>
                  <IonLabel>
                    <p>Payment</p>
                    <h3>{receipt.receiptData.paymentMethod}</h3>
                  </IonLabel>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>
        )}

        {/* Reset / New scan */}
        {(txn || receipt || error) && (
          <IonButton
            expand="block"
            fill="outline"
            onClick={handleReset}
            className="ion-margin-top"
          >
            Scan Next Vehicle
          </IonButton>
        )}
      </IonContent>
    </IonPage>
  );
}
