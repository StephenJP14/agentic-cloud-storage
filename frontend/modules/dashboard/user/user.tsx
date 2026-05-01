import { useEffect, useState } from "react";
import Register from "./register";
import { getAllUsers, User } from "@/services/user";
import { useAuth } from "@/contexts/auth-context";


export default function UserDashboard() {
    const { user } = useAuth()
    const isSystem = user?.department === 'System'
    const [activeMenu, setActiveMenu] = useState<'data' | 'register'>('data')
    const [loading, setLoading] = useState(false)
    const [users, setUsers] = useState<User[] | null>(null)

    const fetchUsers = async () => {
        setLoading(true)
        const res = await getAllUsers()
        setUsers(res.data.data)
        setLoading(false)
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    return (
        <>
            <div className="flex">
                <button
                    onClick={() => setActiveMenu('data')}
                    className={`py-2 px-8 border-b-2 transition-colors ${activeMenu == 'data' ? 'border-(--z-red) text-white bg-(--z-red) rounded-t-md font-medium' : 'border-gray-300 text-gray-500'}`}
                >
                    Users
                </button>
                {isSystem && (
                    <button
                        onClick={() => setActiveMenu('register')}
                        className={`py-2 px-8 border-b-2 transition-colors ${activeMenu == 'register' ? 'border-(--z-red) text-white bg-(--z-red) rounded-t-md font-medium' : 'border-gray-300 text-gray-500'}`}
                    >
                        Register
                    </button>
                )}
            </div>
            <section className="w-full h-[82vh] bg-white border border-gray-200 rounded-b-md shadow-sm p-6">
                {activeMenu === 'data' && (
                    <div className="w-full h-full flex justify-between gap-4">
                        <div className="w-full rounded-md shadow-sm border border-gray-100">
                            {/* <div className="p-4 flex justify-between">
                                <label htmlFor="status" className="flex gap-2 items-center">
                                    Status
                                    <select
                                        name="status"
                                        id="status"
                                        className="border border-gray-100 p-2 rounded-md"
                                        onChange={(e) => setSearchParams((prev) => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="">All</option>
                                        <option value="pending">Pending</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="ongoing">Ongoing Service</option>
                                        <option value="completed">Completed</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative w-full md:w-60">
                                        <button
                                            onClick={fetchServices}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-(--z-red) flex justify-center items-center text-white rounded-md cursor-pointer"
                                        >
                                            <RiSearchLine size={18} />
                                        </button>
                                        <input
                                            type="text"
                                            placeholder="Search Ticket ID..."
                                            value={searchParams.q}
                                            onChange={(e) => setSearchParams((prev) => ({ ...prev, q: e.target.value }))}
                                            onKeyDown={handleKeyDown}
                                            className="w-full pl-3 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <PaginationControls searchParams={searchParams} setSearchParams={setSearchParams} />
                                </div>
                            </div> */}
                            <div className="w-full h-full overflow-y-auto rounded-md ">
                                <table className="w-full border-collapse text-sm">
                                    <thead className="bg-gray-800 text-white sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 text-left">Username</th>
                                            <th className="p-3 text-left">Department</th>
                                            <th className="p-3 text-left">Role</th>
                                            <th className="p-3 text-left">Branch ID</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-700">
                                        {loading ? (
                                            <tr><td colSpan={7} className="p-10 text-center">Loading data...</td></tr>
                                        ) : users?.length === 0 ? (
                                            <tr><td colSpan={7} className="p-10 text-center text-gray-400 mt-12">No user found.</td></tr>
                                        ) : (
                                            users?.map((s) => (
                                                <tr
                                                    key={s.ID}
                                                    className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer}`}
                                                >
                                                    <td className="p-3 text-gray-400">{s.username}</td>
                                                    <td className="p-3 text-gray-400">{s.department}</td>
                                                    <td className="p-3 text-gray-400">{s.role}</td>
                                                    <td className="p-3 text-gray-400">{s.branch_id || "-"}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                {activeMenu === 'register' && (
                    <Register />
                )}
            </section>
        </>
    )
}