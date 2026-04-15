import { useState } from "react";
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
  IonSearchbar,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { apiFetch } from "../lib/api";

type Transaction = {
  id: number;
  vehicle: {
    id: number;
    licensePlate: string;
    color: string;
    ownerName: string;
    vehicleType: { id: number; name: string };
  };
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
    vehicle: { licensePlate: string; vehicleType: string; color: string; ownerName: string };
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

export default function ExitPage() {
  const [searchPlate, setSearchPlate] = useState("");
  const [searching, setSearching] = useState(false);
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const plate = searchPlate.trim().toUpperCase();
    if (!plate) return;

    setSearching(true);
    setTxn(null);
    setReceipt(null);
    setError("");

    try {
      // Find vehicle by plate
      const vRes = await apiFetch(`/vehicles/by-plate/${encodeURIComponent(plate)}`);
      if (!vRes.ok) {
        setError("Vehicle not found");
        setSearching(false);
        return;
      }
      const vJson = await vRes.json();
      const vehicleId = vJson.data.id;

      // Find open or awaiting-payment transaction
      const tRes = await apiFetch(
        `/transactions?vehicleId=${vehicleId}&status=Open`
      );
      if (!tRes.ok) {
        setError("Failed to fetch transactions");
        setSearching(false);
        return;
      }
      const tJson = await tRes.json();
      let transactions: Transaction[] = tJson.data;

      // Also check AwaitingPayment
      if (transactions.length === 0) {
        const aRes = await apiFetch(
          `/transactions?vehicleId=${vehicleId}&status=AwaitingPayment`
        );
        if (aRes.ok) {
          const aJson = await aRes.json();
          transactions = aJson.data;
        }
      }

      if (transactions.length === 0) {
        setError("No active transaction found for this vehicle");
      } else {
        setTxn(transactions[0]);
      }
    } catch {
      setError("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleExit = async () => {
    if (!txn) return;
    setProcessing(true);
    setError("");

    try {
      const res = await apiFetch(`/transactions/${txn.id}/exit`, {
        method: "POST",
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
    setSearchPlate("");
    setTxn(null);
    setReceipt(null);
    setError("");
  };

  const liveDuration = txn && txn.status === "Open"
    ? Math.round((Date.now() - new Date(txn.entryTime).getTime()) / 60000)
    : null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Vehicle Exit</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Search */}
        {!txn && (
          <>
            <IonSearchbar
              placeholder="Search license plate..."
              value={searchPlate}
              onIonInput={(e) => setSearchPlate(e.detail.value ?? "")}
              debounce={0}
            />
            <IonButton
              expand="block"
              onClick={handleSearch}
              disabled={searching || !searchPlate.trim()}
            >
              {searching ? <IonSpinner name="crescent" /> : "Find Transaction"}
            </IonButton>
          </>
        )}

        {error && (
          <IonText color="danger">
            <p className="ion-padding-start">{error}</p>
          </IonText>
        )}

        {/* Transaction details */}
        {txn && !receipt && (
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
                    <p>Vehicle</p>
                    <h3>{txn.vehicle.licensePlate}</h3>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <p>Type / Color</p>
                    <h3>{txn.vehicle.vehicleType.name} • {txn.vehicle.color}</h3>
                  </IonLabel>
                </IonItem>
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
                {txn.status === "Open" && liveDuration !== null && (
                  <IonItem>
                    <IonLabel>
                      <p>Duration (so far)</p>
                      <h3>{formatDuration(liveDuration)}</h3>
                    </IonLabel>
                  </IonItem>
                )}
                {txn.exitTime && (
                  <IonItem>
                    <IonLabel>
                      <p>Exit Time</p>
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
                      <p>Amount</p>
                      <h2 style={{ color: "var(--ion-color-primary)" }}>
                        {formatCents(txn.amountCents)}
                      </h2>
                    </IonLabel>
                  </IonItem>
                )}
              </IonList>

              {/* Step 1: Exit */}
              {txn.status === "Open" && (
                <IonButton
                  expand="block"
                  color="warning"
                  onClick={handleExit}
                  disabled={processing}
                  className="ion-margin-top"
                >
                  {processing ? <IonSpinner name="crescent" /> : "Exit Vehicle"}
                </IonButton>
              )}

              {/* Step 2: Pay */}
              {txn.status === "AwaitingPayment" && (!txn.payment || txn.payment.status !== "Completed") && (
                <IonButton
                  expand="block"
                  color="success"
                  onClick={handlePayment}
                  disabled={processing}
                  className="ion-margin-top"
                >
                  {processing ? <IonSpinner name="crescent" /> : "Process Payment (QRIS)"}
                </IonButton>
              )}

              {/* Step 3: Receipt */}
              {txn.payment?.status === "Completed" && (
                <IonButton
                  expand="block"
                  onClick={handleReceipt}
                  disabled={processing}
                  className="ion-margin-top"
                >
                  {processing ? <IonSpinner name="crescent" /> : "Generate Receipt"}
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
                    <p>Vehicle</p>
                    <h3>{receipt.receiptData.vehicle.licensePlate}</h3>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <p>Type / Color</p>
                    <h3>{receipt.receiptData.vehicle.vehicleType} • {receipt.receiptData.vehicle.color}</h3>
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
                      <h3>{formatDuration(receipt.receiptData.durationMinutes)}</h3>
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

        {/* Reset button when done or has transaction */}
        {(txn || receipt) && (
          <IonButton
            expand="block"
            fill="outline"
            onClick={handleReset}
            className="ion-margin-top"
          >
            New Search
          </IonButton>
        )}
      </IonContent>
    </IonPage>
  );
}
