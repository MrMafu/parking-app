import { useCallback, useEffect, useState } from "react";
import {
  IonAlert,
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
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { apiFetch } from "../lib/api";

type Vehicle = {
  id: number;
  licensePlate: string;
  color: string;
  ownerName: string;
  vehicleType: { id: number; name: string };
};

type VehicleType = {
  id: number;
  name: string;
};

type ParkingArea = {
  id: number;
  name: string;
  capacity: number;
  occupied: number;
  status: string;
};

export default function EntryPage() {
  // Search state
  const [searchPlate, setSearchPlate] = useState("");
  const [searching, setSearching] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [notFound, setNotFound] = useState(false);

  // New vehicle form state
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [newPlate, setNewPlate] = useState("");
  const [newTypeId, setNewTypeId] = useState<number | undefined>();
  const [newColor, setNewColor] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [registering, setRegistering] = useState(false);

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

  const handleSearch = async () => {
    const plate = searchPlate.trim().toUpperCase();
    if (!plate) return;

    setSearching(true);
    setVehicle(null);
    setNotFound(false);
    setError("");

    try {
      const res = await apiFetch(`/vehicles/by-plate/${encodeURIComponent(plate)}`);
      if (res.ok) {
        const json = await res.json();
        setVehicle(json.data);
      } else {
        setNotFound(true);
        setNewPlate(plate);
        // Fetch vehicle types for registration form
        const vtRes = await apiFetch("/vehicle-types");
        if (vtRes.ok) {
          const vtJson = await vtRes.json();
          setVehicleTypes(vtJson.data);
        }
      }
    } catch {
      setError("Failed to search vehicle");
    } finally {
      setSearching(false);
    }
  };

  const handleRegister = async () => {
    if (!newPlate || !newTypeId || !newColor || !newOwner) {
      setError("All fields are required");
      return;
    }

    setRegistering(true);
    setError("");

    try {
      const res = await apiFetch("/vehicles", {
        method: "POST",
        body: JSON.stringify({
          licensePlate: newPlate.toUpperCase(),
          vehicleTypeId: newTypeId,
          color: newColor,
          ownerName: newOwner,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setVehicle(json.data);
        setNotFound(false);
      } else {
        setError(json.message || "Failed to register vehicle");
      }
    } catch {
      setError("Failed to register vehicle");
    } finally {
      setRegistering(false);
    }
  };

  const handleEntry = async () => {
    if (!vehicle || !selectedAreaId) {
      setError("Select a parking area");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await apiFetch("/transactions", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: vehicle.id,
          areaId: selectedAreaId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg(
          `Vehicle ${vehicle.licensePlate} entered! Transaction #${json.data.id}`
        );
        resetForm();
        fetchAreas();
      } else {
        setError(json.message || "Failed to create transaction");
      }
    } catch {
      setError("Failed to create transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSearchPlate("");
    setVehicle(null);
    setNotFound(false);
    setNewPlate("");
    setNewTypeId(undefined);
    setNewColor("");
    setNewOwner("");
    setSelectedAreaId(undefined);
    setError("");
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Vehicle Entry</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonAlert
          isOpen={!!successMsg}
          header="Success"
          message={successMsg}
          buttons={["OK"]}
          onDidDismiss={() => setSuccessMsg("")}
        />

        {/* Search */}
        <IonSearchbar
          placeholder="Search license plate..."
          value={searchPlate}
          onIonInput={(e) => setSearchPlate(e.detail.value ?? "")}
          onIonClear={() => resetForm()}
          debounce={0}
        />
        <IonButton
          expand="block"
          onClick={handleSearch}
          disabled={searching || !searchPlate.trim()}
          className="ion-margin-bottom"
        >
          {searching ? <IonSpinner name="crescent" /> : "Search"}
        </IonButton>

        {error && (
          <IonText color="danger">
            <p className="ion-padding-start">{error}</p>
          </IonText>
        )}

        {/* Vehicle found */}
        {vehicle && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: 16 }}>
                {vehicle.licensePlate}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>Type: {vehicle.vehicleType.name}</p>
              <p>Color: {vehicle.color}</p>
              <p>Owner: {vehicle.ownerName}</p>
            </IonCardContent>
          </IonCard>
        )}

        {/* Vehicle not found — register */}
        {notFound && !vehicle && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: 16 }}>
                Vehicle Not Found — Register
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel position="stacked">License Plate</IonLabel>
                  <IonInput
                    value={newPlate}
                    onIonInput={(e) => setNewPlate(e.detail.value ?? "")}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Vehicle Type</IonLabel>
                  <IonSelect
                    value={newTypeId}
                    onIonChange={(e) => setNewTypeId(e.detail.value)}
                    placeholder="Select type"
                  >
                    {vehicleTypes.map((vt) => (
                      <IonSelectOption key={vt.id} value={vt.id}>
                        {vt.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Color</IonLabel>
                  <IonInput
                    value={newColor}
                    onIonInput={(e) => setNewColor(e.detail.value ?? "")}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Owner Name</IonLabel>
                  <IonInput
                    value={newOwner}
                    onIonInput={(e) => setNewOwner(e.detail.value ?? "")}
                  />
                </IonItem>
              </IonList>
              <IonButton
                expand="block"
                onClick={handleRegister}
                disabled={registering}
                className="ion-margin-top"
              >
                {registering ? <IonSpinner name="crescent" /> : "Register Vehicle"}
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {/* Area selection + submit */}
        {vehicle && (
          <>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Parking Area</IonLabel>
                <IonSelect
                  value={selectedAreaId}
                  onIonChange={(e) => setSelectedAreaId(e.detail.value)}
                  placeholder="Select area"
                >
                  {areas.map((a) => (
                    <IonSelectOption key={a.id} value={a.id}>
                      {a.name} ({a.occupied}/{a.capacity})
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            </IonList>

            <IonButton
              expand="block"
              color="success"
              onClick={handleEntry}
              disabled={submitting || !selectedAreaId}
              className="ion-margin-top"
            >
              {submitting ? <IonSpinner name="crescent" /> : "Confirm Entry"}
            </IonButton>
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
