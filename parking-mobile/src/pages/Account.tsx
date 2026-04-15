import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import {
  personOutline,
  mailOutline,
  shieldOutline,
  logOutOutline,
} from "ionicons/icons";
import { useAuth } from "../context/AuthContext";

export default function AccountPage() {
  const { user, logout } = useAuth();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Account</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="ion-text-center ion-padding">
          <IonIcon
            icon={personOutline}
            style={{ fontSize: 64, color: "var(--ion-color-primary)" }}
          />
          <IonText>
            <h2 style={{ marginBottom: 0 }}>{user?.fullname}</h2>
            <p style={{ marginTop: 4 }}>@{user?.username}</p>
          </IonText>
        </div>

        <IonCard>
          <IonCardContent>
            <IonList lines="none">
              <IonItem>
                <IonIcon icon={mailOutline} slot="start" />
                <IonLabel>
                  <p>Email</p>
                  <h3>{user?.email}</h3>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonIcon icon={shieldOutline} slot="start" />
                <IonLabel>
                  <p>Role</p>
                  <h3 style={{ textTransform: "capitalize" }}>
                    {user?.role.name}
                  </h3>
                </IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        <IonButton
          expand="block"
          color="danger"
          onClick={() => logout()}
          className="ion-margin-top"
        >
          <IonIcon icon={logOutOutline} slot="start" />
          Logout
        </IonButton>
      </IonContent>
    </IonPage>
  );
}
