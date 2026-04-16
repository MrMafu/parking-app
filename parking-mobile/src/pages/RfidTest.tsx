import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
} from "@ionic/react";
import { useState } from "react";
import { useRfidReader } from "../hooks/useRfidReader";

export default function RfidTestPage() {
  const { tagId, isReading, scanCount, lastScanTime, reset } = useRfidReader();
  const [history, setHistory] = useState<{ tag: string; time: Date }[]>([]);

  // Track scan history
  const prevCountRef = useState({ current: 0 })[0];
  if (scanCount > prevCountRef.current && tagId) {
    prevCountRef.current = scanCount;
    setHistory((prev) => [{ tag: tagId, time: new Date() }, ...prev].slice(0, 20));
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>RFID Reader Test</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
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
              Scanner Status
              {isReading ? (
                <IonBadge color="warning">Reading...</IonBadge>
              ) : tagId ? (
                <IonBadge color="success">Tag Captured</IonBadge>
              ) : (
                <IonBadge color="medium">Waiting</IonBadge>
              )}
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p style={{ fontSize: "0.85rem", color: "var(--ion-color-medium)" }}>
              Tap an RFID card on the reader. The tag ID will appear below.
            </p>

            <div
              style={{
                marginTop: 16,
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
                  {isReading ? "Reading tag data..." : "No tag scanned yet"}
                </span>
              )}
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
              <IonNote>Scans: {scanCount}</IonNote>
              <IonNote>
                {lastScanTime
                  ? `Last: ${lastScanTime.toLocaleTimeString("id-ID")}`
                  : "—"}
              </IonNote>
            </div>
          </IonCardContent>
        </IonCard>

        <IonButton
          expand="block"
          color="danger"
          fill="outline"
          onClick={() => {
            reset();
            setHistory([]);
          }}
          style={{ marginTop: 16 }}
        >
          Reset
        </IonButton>

        {history.length > 0 && (
          <IonCard style={{ marginTop: 16 }}>
            <IonCardHeader>
              <IonCardTitle>Scan History</IonCardTitle>
            </IonCardHeader>
            <IonList>
              {history.map((entry, i) => (
                <IonItem key={`${entry.tag}-${entry.time.getTime()}-${i}`}>
                  <IonLabel>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {entry.tag}
                    </span>
                  </IonLabel>
                  <IonNote slot="end">
                    {entry.time.toLocaleTimeString("id-ID")}
                  </IonNote>
                </IonItem>
              ))}
            </IonList>
          </IonCard>
        )}

        <IonCard style={{ marginTop: 16 }}>
          <IonCardHeader>
            <IonCardTitle>How It Works</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>
              The USB HID RFID reader emulates a keyboard. When a card is tapped,
              it "types" the tag ID very quickly (&lt;50ms between keystrokes)
              followed by Enter.
            </p>
            <p style={{ marginTop: 8 }}>
              The hook detects this rapid input pattern and captures it as a tag ID,
              filtering out normal human typing.
            </p>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
