import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window === "undefined") {
      return;
    }

    const token =
      localStorage.getItem("token") || localStorage.getItem("access_token");

    const guestMode = localStorage.getItem("guest_mode");

    if (!token && guestMode !== "true") {
      throw redirect({
        to: "/login",
      });
    }
  },

  component: () => (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  ),
});