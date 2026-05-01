'use client'

import { useState, useEffect, useRef } from "react"
import { getServiceCenters, ServiceCenter } from "@/services/serviceCenter"
import { createUser, RegisterUser } from "@/services/user";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { RiSearchLine } from "react-icons/ri";

export default function Register() {
    const { user } = useAuth()
    const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
    const [loading, setLoading] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [form, setForm] = useState<RegisterUser>({
        username: '',
        password: '',
        branch_id: '',
        department: 'cs', // Default value
        role: 'user',
    })

    // ... useEffect fetchCenters dan handleClickOutside tetap sama ...
    useEffect(() => {
        const fetchCenters = async () => {
            setLoading(true);
            try {
                const res = await getServiceCenters("");
                const centers = res.data.data;
                setServiceCenters(centers);
            } catch (error) {
                console.error("Failed to fetch service centers:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCenters();

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCenters = serviceCenters.filter(center =>
        center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        center.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectCenter = (center: ServiceCenter) => {
        setForm(prev => ({ ...prev, branch_id: center.branch_id }));
        setSearchTerm(center.name);
        setIsDropdownOpen(false);
    };

    // Handler umum untuk input dan select
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setForm(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.branch_id) {
            toast.error("Please select a Service Center from the list");
            return;
        }

        try {
            const res = await createUser(form)
            toast.success(res.data.message)
            setForm(prev => ({ ...prev, username: '', password: '', branch_id: '', department: 'cs' }));
            setSearchTerm("");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to register user")
        }
    };

    const selectedCenterName = serviceCenters.find(c => c.branch_id === form.branch_id)?.name;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-md max-w-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-2">Register User</h2>

            <div className="flex flex-col gap-1">
                <label htmlFor="username" className="text-sm font-medium text-gray-500">Username</label>
                <input
                    id="username"
                    className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                    type="text"
                    value={form.username}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-sm font-medium text-gray-500">Password</label>
                <input
                    id="password"
                    className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                />
            </div>

            {/* Department Select */}
            <div className="flex flex-col gap-1">
                <label htmlFor="department" className="text-sm font-medium text-gray-500">Department</label>
                <select
                    id="department"
                    className="p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-red-500 outline-none"
                    value={form.department}
                    onChange={handleChange}
                    required
                >
                    <option value="cs">CS</option>
                    <option value="System">System</option>
                </select>
            </div>

            <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
                <label className="text-sm font-medium text-gray-500">Service Center Assignment</label>
                <div className="relative">
                    <input
                        type="text"
                        className="p-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none pr-10"
                        placeholder="Search service center..."
                        value={searchTerm}
                        onFocus={() => setIsDropdownOpen(true)}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsDropdownOpen(true);
                            if (form.branch_id) setForm(prev => ({ ...prev, branch_id: '' }));
                        }}
                    />
                    <RiSearchLine className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>

                {isDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        {loading ? (
                            <div className="p-3 text-sm text-gray-500">Loading...</div>
                        ) : filteredCenters.length > 0 ? (
                            filteredCenters.map((center) => (
                                <div
                                    key={center.branch_id}
                                    className={`p-3 hover:bg-red-50 cursor-pointer border-b border-gray-50 last:border-none ${form.branch_id === center.branch_id ? 'bg-red-50' : ''}`}
                                    onClick={() => handleSelectCenter(center)}
                                >
                                    <p className="font-bold text-sm text-gray-800">{center.name}</p>
                                    <p className="text-xs text-gray-500">{center.city}, {center.province}</p>
                                </div>
                            ))
                        ) : (
                            <div className="p-3 text-sm text-gray-500">No centers found.</div>
                        )}
                    </div>
                )}

                {form.branch_id && (
                    <p className="text-[11px] text-green-600 font-medium mt-1">
                        Selected: {selectedCenterName} (ID: {form.branch_id})
                    </p>
                )}
            </div>

            <div className="flex justify-end mt-4">
                <button
                    type="submit"
                    disabled={loading || !form.branch_id}
                    className="px-6 py-3 bg-(--z-red) hover:bg-red-700 text-white rounded-md font-semibold transition-all active:scale-95 disabled:bg-gray-400"
                >
                    Register
                </button>
            </div>
        </form>
    )
}