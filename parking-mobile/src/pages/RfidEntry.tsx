import { useCallback, useEffect, useState } from "react";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
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

type ParkingArea = {
  id: number;
  name: string;
  capacity: number;
  occupied: number;
  status: string;
};

export default function RfidEntryPage() {
  const { tagId, isReading, scanCount, reset: resetReader, setManualTagId } = useRfidReader();
  const [manualInput, setManualInput] = useState("");

  // Parking area selection
  const [areas, setAreas] = useState<ParkingArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | undefined>();

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  const fetchAreas = useCallback(async () => {
    try {
      const res = await apiFetch("/parking-areas");
      if (res.ok) {
        const json = await res.json();
        setAreas(
          (json.data as ParkingArea[]).filter(
            (a) => a.status === "Open" && a.occupied < a.capacity
          )
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const handleEntry = async () => {
    if (!tagId || !selectedAreaId) return;
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await apiFetch("/transactions/rfid-entry", {
        method: "POST",
        body: JSON.stringify({ tagId, areaId: selectedAreaId }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg(
          `Entry recorded! Transaction #${json.data.id} — Area: ${json.data.parkingArea.name}`
        );
        resetReader();
        setSelectedAreaId(undefined);
        fetchAreas();
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
    setSelectedAreaId(undefined);
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
          <IonTitle>RFID Entry</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
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
              <IonButton
                expand="block"
                style={{ marginTop: 12 }}
                onClick={handleNewScan}
              >
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

        {/* Area selection + confirm — only show when tag is scanned and no success yet */}
        {tagId && !successMsg && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Select Parking Area</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {areas.length === 0 ? (
                <IonText color="warning">
                  <p>No available parking areas</p>
                </IonText>
              ) : (
                <IonList>
                  <IonItem>
                    <IonSelect
                      placeholder="Choose area"
                      value={selectedAreaId}
                      onIonChange={(e) => setSelectedAreaId(e.detail.value)}
                    >
                      {areas.map((area) => (
                        <IonSelectOption key={area.id} value={area.id}>
                          {area.name} ({area.occupied}/{area.capacity})
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                </IonList>
              )}

              <IonButton
                expand="block"
                style={{ marginTop: 16 }}
                disabled={!selectedAreaId || submitting}
                onClick={handleEntry}
              >
                {submitting ? <IonSpinner name="dots" /> : "Confirm Entry"}
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
}
