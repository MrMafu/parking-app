import { useCallback, useEffect, useState } from "react";
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonGrid,
  IonItem,
  IonLabel,
  IonList,
  IonRow,
  IonSpinner,
  IonText,
} from "@ionic/react";
import { apiFetch } from "../lib/api";

type AreaRevenue = {
  areaId: number;
  areaName: string;
  revenue: number;
  count: number;
};

type DashboardStats = {
  todayRevenue: number;
  todayTransactions: number;
  activeTransactions: number;
  weekRevenue: number;
  monthRevenue: number;
  revenueByArea: AreaRevenue[];
};

type RecentTransaction = {
  id: number;
  tagId: string | null;
  parkingArea: { id: number; name: string };
  entryTime: string;
  exitTime: string | null;
  amountCents: number | null;
  status: string;
};

function formatCents(cents: number): string {
  return `Rp ${cents.toLocaleString("id-ID")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function OwnerDashboard({ onRefresh }: { onRefresh?: (fn: () => Promise<void>) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, txnRes] = await Promise.all([
        apiFetch("/reports/dashboard"),
        apiFetch("/transactions?status=Closed"),
      ]);

      if (statsRes.ok) {
        const json = await statsRes.json();
        setStats(json.data);
      }

      if (txnRes.ok) {
        const json = await txnRes.json();
        setRecent((json.data as RecentTransaction[]).slice(0, 10));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    onRefresh?.(() => fetchData());
  }, [onRefresh, fetchData]);

  if (loading) {
    return (
      <div className="ion-text-center ion-padding">
        <IonSpinner />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="ion-text-center ion-padding">
        <IonText color="medium">
          <p>Failed to load dashboard data</p>
        </IonText>
      </div>
    );
  }

  return (
    <>
            {/* Revenue Summary Cards */}
            <IonGrid className="ion-padding-horizontal">
              <IonRow>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent className="ion-text-center">
                      <IonText color="success">
                        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                          {formatCents(stats.todayRevenue)}
                        </h2>
                      </IonText>
                      <IonText color="medium">
                        <p style={{ margin: 0, fontSize: 12 }}>Today's Revenue</p>
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent className="ion-text-center">
                      <IonText color="primary">
                        <h2 style={{ margin: 0 }}>{stats.todayTransactions}</h2>
                      </IonText>
                      <IonText color="medium">
                        <p style={{ margin: 0, fontSize: 12 }}>Today's Transactions</p>
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent className="ion-text-center">
                      <IonText color="warning">
                        <h2 style={{ margin: 0 }}>{stats.activeTransactions}</h2>
                      </IonText>
                      <IonText color="medium">
                        <p style={{ margin: 0, fontSize: 12 }}>Active Now</p>
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent className="ion-text-center">
                      <IonText color="success">
                        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                          {formatCents(stats.weekRevenue)}
                        </h2>
                      </IonText>
                      <IonText color="medium">
                        <p style={{ margin: 0, fontSize: 12 }}>This Week</p>
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* Monthly Revenue */}
            <IonCard className="ion-margin-horizontal">
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: 14 }}>This Month</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonText color="success">
                  <h1 style={{ margin: 0, fontWeight: 700 }}>
                    {formatCents(stats.monthRevenue)}
                  </h1>
                </IonText>
              </IonCardContent>
            </IonCard>

            {/* Revenue by Area */}
            {stats.revenueByArea.length > 0 && (
              <IonCard className="ion-margin-horizontal">
                <IonCardHeader>
                  <IonCardTitle style={{ fontSize: 14 }}>
                    Revenue by Area (This Month)
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList lines="full">
                    {stats.revenueByArea.map((area) => (
                      <IonItem key={area.areaId}>
                        <IonLabel>
                          <h3>{area.areaName}</h3>
                          <p>{area.count} transactions</p>
                        </IonLabel>
                        <IonText slot="end" color="success">
                          <strong>{formatCents(area.revenue)}</strong>
                        </IonText>
                      </IonItem>
                    ))}
                  </IonList>
                </IonCardContent>
              </IonCard>
            )}

            {/* Recent Transactions */}
            <div className="ion-padding-horizontal">
              <IonText>
                <h6 className="ion-padding-start" style={{ marginBottom: 4 }}>
                  Recent Transactions
                </h6>
              </IonText>
            </div>

            {recent.length === 0 ? (
              <div className="ion-text-center ion-padding">
                <IonText color="medium">
                  <p>No closed transactions yet</p>
                </IonText>
              </div>
            ) : (
              <IonList className="ion-margin-horizontal">
                {recent.map((txn) => (
                  <IonItem key={txn.id}>
                    <IonLabel>
                      <h3>{txn.tagId ?? `#${txn.id}`}</h3>
                      <p>
                        {txn.parkingArea.name} •{" "}
                        {txn.exitTime ? formatDate(txn.exitTime) : "—"}
                      </p>
                    </IonLabel>
                    <IonText slot="end" color="success">
                      {txn.amountCents != null
                        ? formatCents(txn.amountCents)
                        : "—"}
                    </IonText>
                  </IonItem>
                ))}
              </IonList>
            )}
    </>
  );
}
