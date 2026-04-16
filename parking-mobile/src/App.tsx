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
import RfidEntryPage from "./pages/RfidEntry";
import RfidExitPage from "./pages/RfidExit";
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

const PUBLIC_RFID_PATHS = ["/rfid-test", "/rfid-entry", "/rfid-exit"];

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <IonRouterOutlet>
      {/* Public RFID pages — no auth required */}
      <Route exact path="/rfid-test" component={RfidTestPage} />
      <Route exact path="/rfid-entry" component={RfidEntryPage} />
      <Route exact path="/rfid-exit" component={RfidExitPage} />

      {!user ? (
        <>
          <Route exact path="/login" component={LoginPage} />
          <Route
            render={({ location }) =>
              PUBLIC_RFID_PATHS.includes(location.pathname) ? null : (
                <Redirect to="/login" />
              )
            }
          />
        </>
      ) : (
        <>
          <Route exact path="/login" render={() => <Redirect to="/home" />} />
          <Route render={({ location }) => {
            if (PUBLIC_RFID_PATHS.includes(location.pathname)) return null;
            return <AppTabs />;
          }} />
        </>
      )}
    </IonRouterOutlet>
  );
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