"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import type { PublicUser } from "@/types";
import {
  LayoutDashboard,
  Building2,
  Tag,
  Car,
  CircleDollarSign,
  Users,
  ClipboardList,
  LogOut,
  ParkingSquare,
  type LucideIcon,
} from "lucide-react";

type Props = {
  user: PublicUser;
};

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/parking-areas", label: "Parking Areas", icon: Building2 },
  { href: "/dashboard/vehicle-types", label: "Vehicle Types", icon: Tag },
  { href: "/dashboard/vehicles", label: "Vehicles", icon: Car },
  { href: "/dashboard/rates", label: "Rates", icon: CircleDollarSign },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/activity-logs", label: "Activity Logs", icon: ClipboardList },
];

export default function Sidebar({ user }: Props) {
  const { logout } = useAuthContext();
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 min-h-screen bg-white border-r border-light-shade flex flex-col">
      {/* App logo + name */}
      <div className="px-5 py-6 border-b border-light-shade space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <ParkingSquare className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-dark leading-tight">Parking Management</span>
        </div>

        {/* User info + logout */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-tint flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-semibold">
              {user.fullname.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-dark truncate">{user.fullname}</p>
            <p className="text-xs text-medium truncate">{user.role.name}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="shrink-0 p-1.5 rounded-lg text-medium hover:bg-light hover:text-dark transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-medium hover:bg-light hover:text-dark"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
