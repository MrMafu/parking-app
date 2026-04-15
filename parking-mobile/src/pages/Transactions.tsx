import { useCallback, useEffect, useState } from "react";
import {
  IonBadge,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
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
  } | null;
};

const STATUS_FILTERS = ["All", "Open", "AwaitingPayment", "Closed", "Cancelled"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function statusColor(status: string) {
  switch (status) {
    case "Open": return "primary";
    case "AwaitingPayment": return "warning";
    case "Closed": return "success";
    case "Cancelled": return "medium";
    default: return "medium";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatCents(cents: number): string {
  return `Rp ${(cents / 100).toLocaleString("id-ID")}`;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const query = filter !== "All" ? `?status=${filter}` : "";
      const res = await apiFetch(`/transactions${query}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Transactions</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            value={filter}
            onIonChange={(e) => setFilter(e.detail.value as StatusFilter)}
            scrollable
          >
            {STATUS_FILTERS.map((s) => (
              <IonSegmentButton key={s} value={s}>
                <IonLabel>{s === "AwaitingPayment" ? "Awaiting" : s}</IonLabel>
              </IonSegmentButton>
            ))}
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            await fetchTransactions();
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        {loading ? (
          <div className="ion-text-center ion-padding">
            <IonSpinner />
          </div>
        ) : transactions.length === 0 ? (
          <div className="ion-text-center ion-padding">
            <IonText color="medium">
              <p>No transactions found</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {transactions.map((txn) => (
              <div key={txn.id}>
                <IonItem
                  button
                  onClick={() =>
                    setExpandedId(expandedId === txn.id ? null : txn.id)
                  }
                >
                  <IonLabel>
                    <h2>{txn.vehicle.licensePlate}</h2>
                    <p>
                      {txn.parkingArea.name} • {formatDate(txn.entryTime)}
                    </p>
                  </IonLabel>
                  <IonBadge slot="end" color={statusColor(txn.status)}>
                    {txn.status}
                  </IonBadge>
                </IonItem>

                {expandedId === txn.id && (
                  <div
                    style={{
                      padding: "0 16px 12px 16px",
                      background: "var(--ion-color-light)",
                    }}
                  >
                    <IonText color="medium">
                      <p style={{ margin: "4px 0" }}>
                        <strong>Type:</strong> {txn.vehicle.vehicleType.name} •{" "}
                        <strong>Color:</strong> {txn.vehicle.color}
                      </p>
                      <p style={{ margin: "4px 0" }}>
                        <strong>Owner:</strong> {txn.vehicle.ownerName}
                      </p>
                      <p style={{ margin: "4px 0" }}>
                        <strong>Entry:</strong> {formatDate(txn.entryTime)}
                      </p>
                      {txn.exitTime && (
                        <p style={{ margin: "4px 0" }}>
                          <strong>Exit:</strong> {formatDate(txn.exitTime)}
                        </p>
                      )}
                      {txn.durationMinutes != null && (
                        <p style={{ margin: "4px 0" }}>
                          <strong>Duration:</strong> {txn.durationMinutes} min
                        </p>
                      )}
                      {txn.amountCents != null && (
                        <p style={{ margin: "4px 0" }}>
                          <strong>Amount:</strong>{" "}
                          {formatCents(txn.amountCents)}
                        </p>
                      )}
                      {txn.payment && (
                        <p style={{ margin: "4px 0" }}>
                          <strong>Payment:</strong> {txn.payment.paymentMethod}{" "}
                          ({txn.payment.status})
                        </p>
                      )}
                    </IonText>
                  </div>
                )}
              </div>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
}
