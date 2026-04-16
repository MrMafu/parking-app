import { Redirect, Route } from "react-router-dom";
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import {
  homeOutline,
  logInOutline,
  logOutOutline,
  listOutline,
  personOutline,
} from "ionicons/icons";
import LoginPage from "./pages/Login";
import HomePage from "./pages/Home";
import EntryPage from "./pages/Entry";
import ExitPage from "./pages/Exit";
import TransactionsPage from "./pages/Transactions";
import AccountPage from "./pages/Account";
import RfidTestPage from "./pages/RfidTest";
import { useAuth } from "./context/AuthContext";

setupIonicReact({ mode: "ios" });

import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import "./theme/variables.css";

function AppTabs() {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/home" component={HomePage} />
        <Route exact path="/entry" component={EntryPage} />
        <Route exact path="/exit" component={ExitPage} />
        <Route exact path="/rfid-test" component={RfidTestPage} />
        <Route exact path="/transactions" component={TransactionsPage} />
        <Route exact path="/account" component={AccountPage} />
        <Route exact path="/" render={() => <Redirect to="/home" />} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/home">
          <IonIcon icon={homeOutline} />
          <IonLabel>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="entry" href="/entry">
          <IonIcon icon={logInOutline} />
          <IonLabel>Entry</IonLabel>
        </IonTabButton>
        <IonTabButton tab="exit" href="/exit">
          <IonIcon icon={logOutOutline} />
          <IonLabel>Exit</IonLabel>
        </IonTabButton>
        <IonTabButton tab="transactions" href="/transactions">
          <IonIcon icon={listOutline} />
          <IonLabel>History</IonLabel>
        </IonTabButton>
        <IonTabButton tab="account" href="/account">
          <IonIcon icon={personOutline} />
          <IonLabel>Account</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <IonRouterOutlet>
        <Route exact path="/login" component={LoginPage} />
        <Route render={() => <Redirect to="/login" />} />
      </IonRouterOutlet>
    );
  }

  return <AppTabs />;
}

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </IonApp>
  );
}