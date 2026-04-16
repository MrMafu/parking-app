import { useCallback, useEffect, useState } from "react";
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
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  IonBadge,
  IonNote,
} from "@ionic/react";
import { apiFetch } from "../lib/api";
import { useRfidReader } from "../hooks/useRfidReader";

type VehicleType = {
  id: number;
  name: string;
};

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
  return `Rp ${(cents / 100).toLocaleString("id-ID")}`;
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

  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>();

  const [txn, setTxn] = useState<Transaction | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  // Fetch vehicle types on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/vehicle-types");
        if (res.ok) {
          const json = await res.json();
          setVehicleTypes(json.data);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Auto-lookup transaction when tag is scanned
  useEffect(() => {
    if (!tagId) return;

    const lookup = async () => {
      setLoading(true);
      setError("");
      setTxn(null);
      setReceipt(null);
      setSelectedTypeId(undefined);

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

  const handleExit = async () => {
    if (!tagId || !selectedTypeId) return;
    setProcessing(true);
    setError("");

    try {
      const res = await apiFetch("/transactions/rfid-exit", {
        method: "POST",
        body: JSON.stringify({ tagId, vehicleTypeId: selectedTypeId }),
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
      // Create payment
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

      // Complete payment
      const cRes = await apiFetch(`/payments/${pJson.data.id}/complete`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const cJson = await cRes.json();
      if (!cRes.ok) {
        setError(cJson.message || "Failed to complete payment");
        setProcessing(false);
        return;
      }

      // Refresh transaction
      const tRes = await apiFetch(`/transactions/${txn.id}`);
      if (tRes.ok) {
        const tJson = await tRes.json();
        setTxn(tJson.data);
      }
    } catch {
      setError("Payment failed");
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
    resetReader();
    setTxn(null);
    setReceipt(null);
    setSelectedTypeId(undefined);
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

              {/* Vehicle type selection */}
              <IonCard style={{ margin: "16px 0 0", boxShadow: "none", border: "1px solid var(--ion-color-light-shade)" }}>
                <IonCardHeader>
                  <IonCardTitle style={{ fontSize: 14 }}>
                    Select Vehicle Type
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList>
                    <IonItem>
                      <IonSelect
                        placeholder="Choose vehicle type"
                        value={selectedTypeId}
                        onIonChange={(e) => setSelectedTypeId(e.detail.value)}
                      >
                        {vehicleTypes.map((vt) => (
                          <IonSelectOption key={vt.id} value={vt.id}>
                            {vt.name}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  </IonList>
                </IonCardContent>
              </IonCard>

              <IonButton
                expand="block"
                color="warning"
                onClick={handleExit}
                disabled={!selectedTypeId || processing}
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

              {(!txn.payment || txn.payment.status !== "Completed") && (
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
                    "Process Payment (QRIS)"
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
