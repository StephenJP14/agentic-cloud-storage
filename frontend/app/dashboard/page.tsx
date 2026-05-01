import Dashboard from "@/modules/dashboard/dashboard";
import { Suspense } from "react";

export default function DashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Dashboard />
        </Suspense>
    )
}