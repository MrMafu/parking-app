export type PublicUser = {
  id: number;
  fullname: string;
  username: string;
  email: string;
  role: { id: number; name: string };
  isActive: boolean;
};

export type ParkingArea = {
  id: number;
  name: string;
  capacity: number;
  occupied: number;
  location: string | null;
  status: "Open" | "Closed" | "Maintenance";
};

export type VehicleType = {
  id: number;
  name: string;
  description: string | null;
};

export type Vehicle = {
  id: number;
  licensePlate: string;
  vehicleTypeId: number;
  vehicleType: VehicleType;
  color: string;
  ownerName: string;
  registeredById: number;
};

export type Rate = {
  id: number;
  name: string;
  vehicleTypeId: number;
  vehicleType: VehicleType;
  rateType: "Hourly" | "Daily" | "Flat";
  priceCents: number;
  graceMinutes: number;
  validFrom: string;
  validTo: string;
};
