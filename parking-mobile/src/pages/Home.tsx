import { useCallback, useEffect, useRef, useState } from "react";
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonPage,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { logInOutline, logOutOutline } from "ionicons/icons";
import { useIonRouter } from "@ionic/react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import OwnerDashboard from "./OwnerDashboard";
import { ChartCard, OccupancyBarChart, Sparkline } from "../components/charts";

type ParkingArea = {
  id: number;
  name: string;
  capacity: number;
  occupied: number;
  location: string | null;
  status: string;
};

export default function HomePage() {
  const { hasPermission } = useAuth();
  const isOwner = hasPermission("reports.view");
  const isAttendant = hasPermission("transactions.create");
  const router = useIonRouter();

  const [areas, setAreas] = useState<ParkingArea[]>([]);
  const [loading, setLoading] = useState(!isOwner); // only load areas for attendants
  const [entryRequests, setEntryRequests] = useState<Array<{id:number; tagId:string; areaId:number; createdAt:string}>>([]);
  const [exitRequests, setExitRequests] = useState<Array<{id:number; tagId:string; createdAt:string}>>([]);
  const [awaitingPayments, setAwaitingPayments] = useState<Array<{id:number; tagId:string | null; amountCents:number | null; entryTime:string}>>([]);
  const [awaitingPaymentsLoading, setAwaitingPaymentsLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [exitRequestsLoading, setExitRequestsLoading] = useState(false);

  // Store owner dashboard refresh fn
  const ownerRefreshRef = useRef<(() => Promise<void>) | null>(null);

  const fetchAreas = useCallback(async () => {
    try {
      const res = await apiFetch("/parking-areas");
      if (res.ok) {
        const json = await res.json();
        setAreas(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOwner) fetchAreas();
    if (isAttendant) fetchEntryRequests();
    if (isAttendant) fetchExitRequests();
    if (isAttendant) fetchAwaitingPayments();
    if (isAttendant) fetchOccupancySeries();
  }, [fetchAreas, isOwner]);

  const fetchAwaitingPayments = async () => {
    setAwaitingPaymentsLoading(true);
    try {
      const res = await apiFetch(`/transactions?status=AwaitingPayment`);
      if (res.ok) {
        const json = await res.json();
        setAwaitingPayments(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setAwaitingPaymentsLoading(false);
    }
  };

  const fetchEntryRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await apiFetch("/entry-requests");
      if (res.ok) {
        const json = await res.json();
        setEntryRequests(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchExitRequests = async () => {
    setExitRequestsLoading(true);
    try {
      const res = await apiFetch("/exit-requests");
      if (res.ok) {
        const json = await res.json();
        setExitRequests(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setExitRequestsLoading(false);
    }
  };

  const approveRequest = async (id: number) => {
    try {
      const res = await apiFetch(`/entry-requests/${id}/approve`, { method: "POST" });
      if (res.ok) {
        // refresh lists
        await fetchEntryRequests();
        await fetchAreas();
      } else {
        const json = await res.json();
        alert(json.message || "Failed to approve request");
      }
    } catch {
      alert("Network error");
    }
  };

  const approveExitRequest = async (id: number) => {
    try {
      const res = await apiFetch(`/exit-requests/${id}/approve`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        // Navigate attendant to the exit screen preloaded with the transaction
        const txn = json.data;
        await fetchExitRequests();
        if (txn && txn.id) {
          router.push(`/rfid-exit?txnId=${txn.id}`, "forward");
        }
      } else {
        alert(json.message || "Failed to approve exit request");
      }
    } catch {
      alert("Network error");
    }
  };

  const totalCapacity = areas.reduce((s, a) => s + a.capacity, 0);
  const totalOccupied = areas.reduce((s, a) => s + a.occupied, 0);
  const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  const [occupancySeries, setOccupancySeries] = useState<Record<number, Array<{ date: string; occupied: number }>>>({});

  const fetchOccupancySeries = async () => {
    try {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 6); // last 7 days
      const q = `from=${from.toISOString().slice(0,10)}&to=${to.toISOString().slice(0,10)}&groupBy=day`;
      const res = await apiFetch(`/reports/occupancy-by-area?${q}`);
      if (res.ok) {
        const json = await res.json();
        // expected shape: [{ areaId, areaName, date, occupied, capacity }]
        const map: Record<number, Array<{ date: string; occupied: number }>> = {};
        (json.data || []).forEach((row: any) => {
          if (!map[row.areaId]) map[row.areaId] = [];
          map[row.areaId].push({ date: row.date, occupied: row.occupied });
        });
        setOccupancySeries(map);
      }
    } catch {
      // ignore
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Open": return "success";
      case "Closed": return "danger";
      case "Maintenance": return "warning";
      default: return "medium";
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            if (isOwner) {
              await ownerRefreshRef.current?.();
            } else {
              await Promise.all([
                fetchAreas(),
                fetchEntryRequests(),
                fetchExitRequests(),
                fetchAwaitingPayments(),
                fetchOccupancySeries(),
              ])
            }
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        {/* Owner view: revenue dashboard */}
        {isOwner && (
          <OwnerDashboard
            onRefresh={(fn) => {
              ownerRefreshRef.current = fn;
            }}
          />
        )}

        {/* Attendant view: parking areas */}
        {isAttendant && (
          <>
            {/* Occupancy chart summary for attendants */}
            <ChartCard title="Area Occupancy">
              <OccupancyBarChart data={areas.map(a => ({ areaName: a.name, occupied: a.occupied, capacity: a.capacity }))} />
            </ChartCard>
            {/* Pending entry requests (attendant) */}
            <div className="ion-padding-horizontal">
              <h6 style={{ marginTop: 8 }}>Pending Entry Requests</h6>
              {requestsLoading ? (
                <div style={{ padding: 8 }}><IonSpinner name="dots" /></div>
              ) : entryRequests.length === 0 ? (
                <div style={{ padding: 8 }}><IonText color="medium">No pending requests</IonText></div>
              ) : (
                entryRequests.map((r) => (
                  <IonCard key={r.id} style={{ marginTop: 8 }}>
                    <IonCardContent>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{r.tagId}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>Area: {r.areaId} • {new Date(r.createdAt).toLocaleTimeString()}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <IonButton size="small" color="success" onClick={() => approveRequest(r.id)}>Approve</IonButton>
                        </div>
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))
              )}
            </div>

            {/* Pending exit requests (attendant) */}
            <div className="ion-padding-horizontal">
              <h6 style={{ marginTop: 8 }}>Pending Exit Requests</h6>
              {exitRequestsLoading ? (
                <div style={{ padding: 8 }}><IonSpinner name="dots" /></div>
              ) : exitRequests.length === 0 ? (
                <div style={{ padding: 8 }}><IonText color="medium">No pending exit requests</IonText></div>
              ) : (
                exitRequests.map((r) => (
                  <IonCard key={r.id} style={{ marginTop: 8 }}>
                    <IonCardContent>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{r.tagId}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>{new Date(r.createdAt).toLocaleTimeString()}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <IonButton size="small" color="success" onClick={() => approveExitRequest(r.id)}>Approve</IonButton>
                        </div>
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))
              )}
            </div>

            {/* Awaiting payments */}
            <div className="ion-padding-horizontal">
              <h6 style={{ marginTop: 8 }}>Awaiting Payments</h6>
              {awaitingPaymentsLoading ? (
                <div style={{ padding: 8 }}><IonSpinner name="dots" /></div>
              ) : awaitingPayments.length === 0 ? (
                <div style={{ padding: 8 }}><IonText color="medium">No awaiting payments</IonText></div>
              ) : (
                awaitingPayments.map((a) => (
                  <IonCard key={a.id} style={{ marginTop: 8 }}>
                    <IonCardContent>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{a.tagId ?? `#${a.id}`}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>{new Date(a.entryTime).toLocaleTimeString()}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <IonButton size="small" color="primary" onClick={() => router.push(`/rfid-exit?txnId=${a.id}`, "forward")}>Continue</IonButton>
                        </div>
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))
              )}
            </div>

            {loading ? (
              <div className="ion-text-center ion-padding">
                <IonSpinner name="dots" />
              </div>
            ) : (
              <>
                <IonGrid className="ion-padding-horizontal">
                  <IonRow>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent className="ion-text-center">
                      <IonText color="primary"><h2 style={{ margin: 0 }}>{areas.length}</h2></IonText>
                      <IonText color="medium"><p style={{ margin: 0, fontSize: 12 }}>Areas</p></IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent className="ion-text-center">
                      <IonText color="primary"><h2 style={{ margin: 0 }}>{totalCapacity}</h2></IonText>
                      <IonText color="medium"><p style={{ margin: 0, fontSize: 12 }}>Total Capacity</p></IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent className="ion-text-center">
                      <IonText color="primary"><h2 style={{ margin: 0 }}>{totalOccupied}</h2></IonText>
                      <IonText color="medium"><p style={{ margin: 0, fontSize: 12 }}>Occupied</p></IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent className="ion-text-center">
                      <IonText color="primary"><h2 style={{ margin: 0 }}>{occupancyPct}%</h2></IonText>
                      <IonText color="medium"><p style={{ margin: 0, fontSize: 12 }}>Occupancy</p></IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>

            <div className="ion-padding-horizontal">
              <IonText><h6 className="ion-padding-start" style={{ marginBottom: 4 }}>Parking Areas</h6></IonText>
            </div>

            {areas.map((area) => {
              const pct = area.capacity > 0 ? area.occupied / area.capacity : 0;
              return (
                <IonCard key={area.id}>
                  <IonCardHeader>
                    <IonCardTitle style={{ fontSize: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div>{area.name}</div>
                        {/* inline sparkline if available */}
                        {occupancySeries[area.id] && (
                          <div style={{ marginLeft: 8 }}>
                            <Sparkline data={occupancySeries[area.id].map(s => ({ date: s.date, value: s.occupied }))} height={36} />
                          </div>
                        )}
                      </div>
                      <IonBadge color={statusColor(area.status)}>{area.status}</IonBadge>
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonProgressBar
                      value={pct}
                      color={pct >= 0.9 ? "danger" : pct >= 0.7 ? "warning" : "success"}
                    />
                    <IonText color="medium">
                      <p style={{ marginTop: 4, marginBottom: 0, fontSize: 13 }}>
                        {area.occupied} / {area.capacity} occupied
                        {area.location ? ` • ${area.location}` : ""}
                      </p>
                    </IonText>
                  </IonCardContent>
                </IonCard>
              );
            })}
          </>
        )}
          </>
        )}
      </IonContent>
    </IonPage>
  );
}