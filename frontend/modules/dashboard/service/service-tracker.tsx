"use client";

import {
  getTrackers,
  updateTrackerStatus,
  ServiceStatus,
  Tracker,
  GetTrackerPayload,
} from "@/services/tracker";

import PaginationControls from "@/components/shared/pagination-controls";
import { useRouter } from "next/dist/client/components/navigation";
import { useEffect, useState } from "react";

export default function ServiceTrackerDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [trackers, setTrackers] = useState<Tracker[] | null>(null);
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<GetTrackerPayload>({
    limit: 25,
    page: 1,
    service_status: "pending" as ServiceStatus,
  });

  const fetchServiceTracker = async () => {
    setIsLoading(true);
    try {
      const res = await getTrackers(searchParams);
      setTrackers(res.data.data);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: ServiceStatus) => {
    setIsLoading(true);
    try {
      const res = await updateTrackerStatus(id, status);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceTracker();
  }, [searchParams]);

  return (
    <>
      <section className="w-full h-full bg-white p-6">
        <div className=" rounded-md shadow-sm border border-gray-100">
          <div className="p-4 flex justify-between">
            <label htmlFor="status" className="flex gap-2 items-center">
              Status
              <select
                name="status"
                id="status"
                className="border border-gray-100 p-2 rounded-md"
                value={searchParams.service_status ?? ""}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    service_status: e.target.value as ServiceStatus,
                  }))
                }
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <div className="flex">
              <PaginationControls
                searchParams={searchParams}
                setSearchParams={setSearchParams}
              />
            </div>
          </div>

          <div className="rounded-md shadow-sm border border-gray-100">
            <div className="w-full h-full overflow-y-auto rounded-md">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-800 text-white sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-left">Ticket</th>
                    <th className="p-3 text-left">Customer</th>
                    <th className="p-3 text-left">Contact</th>
                    <th className="p-3 text-left">Product SN</th>
                    <th className="p-3 text-left">Admission Date</th>
                    <th className="p-3 text-left">Branch</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center">
                        Loading data...
                      </td>
                    </tr>
                  ) : trackers?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-10 text-center text-gray-400 mt-12"
                      >
                        No trackers found.
                      </td>
                    </tr>
                  ) : (
                    trackers?.map((t) => (
                      <tr
                        key={t.ID ?? t.ticket_id}
                        className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="p-3 font-mono text-gray-400">
                          #{t.ticket_id}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold">{t.customer_name}</div>
                        </td>
                        <td className="p-3">
                          <div>{t.email}</div>
                          <div className="text-xs">{t.phone_number}</div>
                        </td>
                        <td className="p-3 font-medium text-blue-600">
                          {t.product_sn}
                        </td>
                        <td className="p-3">
                          {t.admission_date
                            ? new Date(t.admission_date).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "-"}
                        </td>
                        <td
                          className="p-3 max-w-xs truncate"
                          title={t.branch_id}
                        >
                          {t.branch_id || "-"}
                        </td>
                        <td className="p-3">
                          <select
                            value={t.service_status || "pending"}
                            onChange={(e) =>
                              handleUpdateStatus(
                                t.ID ?? t.ticket_id,
                                e.target.value as ServiceStatus,
                              )
                            }
                            className={`p-1.5 rounded border text-xs font-medium outline-none focus:ring-2 focus:ring-red-500
                                      ${t.service_status === "completed" ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}
                                    `}
                          >
                            <option value="pending">Pending</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
