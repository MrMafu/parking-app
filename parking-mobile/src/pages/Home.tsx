import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  IonButton,
  IonContent,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  IonHeader,
} from "@ionic/react";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const history = useHistory();
  const { user, logout, refreshUser } = useAuth();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const handleLogout = async () => {
    await logout();
    history.replace("/login");
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText>
          <h2>{user?.fullname}</h2>
          <p>@{user?.username}</p>
          <p>{user?.email}</p>
          <p>Role: {user?.role.name}</p>
        </IonText>

        <IonButton expand="block" onClick={handleLogout}>
          Logout
        </IonButton>
      </IonContent>
    </IonPage>
  );
}