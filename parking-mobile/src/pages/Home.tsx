import { useCallback, useEffect, useState } from "react";
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
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
import { apiFetch } from "../lib/api";

type ParkingArea = {
  id: number;
  name: string;
  capacity: number;
  occupied: number;
  location: string | null;
  status: string;
};

export default function HomePage() {
  const [areas, setAreas] = useState<ParkingArea[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchAreas();
  }, [fetchAreas]);

  const totalCapacity = areas.reduce((s, a) => s + a.capacity, 0);
  const totalOccupied = areas.reduce((s, a) => s + a.occupied, 0);
  const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

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
            await fetchAreas();
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        {loading ? (
          <div className="ion-text-center ion-padding">
            <IonSpinner />
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
                      {area.name}
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
      </IonContent>
    </IonPage>
  );
}