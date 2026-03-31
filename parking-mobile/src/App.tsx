import { Redirect, Route } from "react-router-dom";
import {
  IonApp,
  IonRouterOutlet,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import LoginPage from "./pages/Login";
import HomePage from "./pages/Home";
import { useAuth } from "./context/AuthContext";

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

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <IonRouterOutlet>
      <Route exact path="/login" component={LoginPage} />
      <Route exact path="/home" component={HomePage} />
      <Route
        exact
        path="/"
        render={() => <Redirect to={user ? "/home" : "/login"} />}
      />
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