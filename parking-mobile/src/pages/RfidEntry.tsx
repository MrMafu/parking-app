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
  IonInput,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  IonBadge,
  IonNote,
  IonButtons,
  IonBackButton,
} from "@ionic/react";
import { useParams, useLocation } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useRfidReader } from "../hooks/useRfidReader";

type ParkingArea = {
  id: number;
  name: string;
  capacity: number;
  occupied: number;
  status: string;
};

export default function RfidEntryPage() {
  // useParams can be stale with Ionic's page caching, so also extract from pathname
  const params = useParams<{ areaId: string }>();
  const location = useLocation();
  const pathAreaId = location.pathname.match(/\/rfid-entry\/(\d+)/)?.[1];
  const areaId = params.areaId || pathAreaId;
  const numericAreaId = areaId ? Number(areaId) : NaN;

  const { tagId, isReading, scanCount, reset: resetReader, setManualTagId } = useRfidReader();
  const [manualInput, setManualInput] = useState("");

  // Area info (fetched for display)
  const [area, setArea] = useState<ParkingArea | null>(null);
  const [areaLoading, setAreaLoading] = useState(true);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  const fetchArea = useCallback(async () => {
    if (isNaN(numericAreaId)) return;
    try {
      const res = await apiFetch("/parking-areas");
      if (res.ok) {
        const json = await res.json();
        const found = (json.data as ParkingArea[]).find((a) => a.id === numericAreaId);
        setArea(found ?? null);
      }
    } catch {
      // ignore
    } finally {
      setAreaLoading(false);
    }
  }, [numericAreaId]);

  useEffect(() => {
    fetchArea();
  }, [fetchArea]);

  const handleEntry = async () => {
    if (!tagId || !numericAreaId) return;
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await apiFetch("/transactions/rfid-entry", {
        method: "POST",
        body: JSON.stringify({ tagId, areaId: numericAreaId }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg(
          `Entry recorded! Transaction #${json.data.id} — Area: ${json.data.parkingArea.name}`
        );
        resetReader();
        fetchArea(); // refresh occupancy
      } else {
        setError(json.message || "Failed to create entry");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewScan = () => {
    resetReader();
    setSuccessMsg("");
    setError("");
    setManualInput("");
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      setManualTagId(manualInput.trim());
      setManualInput("");
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>
            RFID Entry{area ? ` — ${area.name}` : ""}
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">

        {/* Area info card */}
        {areaLoading ? (
          <div className="ion-text-center ion-padding"><IonSpinner /></div>
        ) : !area ? (
          <IonCard style={{ border: "2px solid var(--ion-color-danger)" }}>
            <IonCardContent>
              <IonText color="danger">
                <p style={{ fontWeight: 600, margin: 0 }}>Parking area not found</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          <>
            {/* Scanner Status Card */}
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
                <IonCardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                    <span style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "monospace", letterSpacing: 2 }}>
                      {tagId}
                    </span>
                  ) : (
                    <span style={{ color: "var(--ion-color-medium)" }}>
                      {isReading ? "Reading tag data..." : "Tap a card on the reader to begin"}
                    </span>
                  )}
                </div>
                <IonNote style={{ display: "block", marginTop: 8, textAlign: "center" }}>
                  Total scans this session: {scanCount}
                </IonNote>

                {/* Manual input fallback */}
                {!tagId && (
                  <div style={{ marginTop: 16 }}>
                    <IonItem>
                      <IonInput
                        placeholder="Enter tag ID manually"
                        value={manualInput}
                        onIonInput={(e) => setManualInput(e.detail.value ?? "")}
                        onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                        clearInput
                      />
                      <IonButton slot="end" size="small" onClick={handleManualSubmit} disabled={!manualInput.trim()}>
                        Set
                      </IonButton>
                    </IonItem>
                  </div>
                )}
              </IonCardContent>
            </IonCard>

            {/* Success message */}
            {successMsg && (
              <IonCard style={{ border: "2px solid var(--ion-color-success)" }}>
                <IonCardContent>
                  <IonText color="success">
                    <p style={{ fontWeight: 600, margin: 0 }}>{successMsg}</p>
                  </IonText>
                  <IonButton expand="block" style={{ marginTop: 12 }} onClick={handleNewScan}>
                    Scan Next Vehicle
                  </IonButton>
                </IonCardContent>
              </IonCard>
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

            {/* Confirm button — show when tag is scanned and no success yet */}
            {tagId && !successMsg && (
              <IonButton
                expand="block"
                disabled={submitting}
                onClick={handleEntry}
                className="ion-margin-top"
              >
                {submitting ? <IonSpinner name="dots" /> : "Confirm Entry"}
              </IonButton>
            )}
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
