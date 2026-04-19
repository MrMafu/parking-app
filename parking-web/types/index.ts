export type PublicUser = {
  id: number;
  fullname: string;
  username: string;
  email: string;
  role: { id: number; name: string };
  isActive: boolean;
  permissions: string[];
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

export type ActivityLog = {
  id: number;
  action: string;
  details: string | null;
  createdAt: string;
  user: { id: number; fullname: string; username: string };
};

export type Permission = {
  id: number;
  name: string;
  description: string | null;
};

export type Role = {
  id: number;
  name: string;
  description: string | null;
  permissions: Permission[];
};
