import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    const token = localStorage.getItem("token");
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