import React from "react";
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSpinner, IonText } from "@ionic/react";

export default function ChartCard({ title, loading, error, children }: { title: string; loading?: boolean; error?: string | null; children?: React.ReactNode }) {
  return (
    <IonCard className="ion-margin-horizontal ion-margin-top">
      <IonCardHeader>
        <IonCardTitle style={{ fontSize: 14 }}>{title}</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {loading ? (
          <div style={{ textAlign: "center", padding: 12 }}>
            <IonSpinner />
          </div>
        ) : error ? (
          <IonText color="danger">{error}</IonText>
        ) : (
          children
        )}
      </IonCardContent>
    </IonCard>
  );
}
