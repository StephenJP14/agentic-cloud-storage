"use client"

import { addServiceCenter, deleteServiceCenter, exportServiceCenter, getServiceCenters, updateServiceCenter, importServiceCenter, ServiceCenter, updateBulkServiceCenter } from "@/services/serviceCenter"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { RiSearchLine, RiRefreshLine, RiUploadCloud2Line, RiSave3Line } from "react-icons/ri"
import { HiDownload } from "react-icons/hi";
import { FiDelete } from "react-icons/fi";
import { useAuth } from "@/contexts/auth-context"

export default function ServiceCenterDashboard() {
    const { user } = useAuth()
    const isSystem = user?.department === 'System'
    const [query, setQuery] = useState('')
    const [serviceCenters, setServiceCenters] = useState<ServiceCenter[] | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [editedRows, setEditedRows] = useState<{ [key: string]: ServiceCenter }>({})
    const [isAdding, setIsAdding] = useState(false)
    const [newRow, setNewRow] = useState<Partial<ServiceCenter> | null>(null)

    const handleAddNewClick = () => {
        setIsAdding(true)
        setNewRow({
            name: '',
            branch_type: 'ZSC',
            address: '',
            city: '',
            phone: '',
            pic: '',
            map_url: ''
        })
    }

    const handleCreateRow = async () => {
        if (!newRow?.name || !newRow?.address) {
            toast.error("Name and Address are required")
            return
        }

        const loadingToast = toast.loading("Creating new location...")
        try {
            await addServiceCenter(newRow as ServiceCenter)
            toast.success("New location added", { id: loadingToast })

            setIsAdding(false)
            setNewRow(null)
            fetchServiceCenters() // Refresh data
        } catch (error) {
            toast.error("Failed to create", { id: loadingToast })
        }
    }

    const fetchServiceCenters = async () => {
        setIsLoading(true)
        try {
            const res = await getServiceCenters(query)
            setServiceCenters(res.data.data)
            setEditedRows({}) // Reset editan saat fetch ulang
        } catch (error) {
            console.error("Failed to fetch:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchServiceCenters()
    }, [])

    const handleInputChange = (id: string, field: keyof ServiceCenter, value: string) => {
        const original = serviceCenters?.find(s => String(s.ID) === id)
        if (!original) return

        setEditedRows(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || original),
                [field]: value
            }
        }))
    }

    const handleUpdateRow = async (id: string) => {
        const updatedData = editedRows[id]
        console.log(`Updating Row ID: ${id}`, updatedData)

        const loadingToast = toast.loading("Updating...")
        try {
            await updateServiceCenter(updatedData)

            toast.success("Data updated")

            // Update state lokal agar input kembali bersih (opsional)
            setServiceCenters(prev => prev?.map(s => String(s.ID) === id ? updatedData : s) || null)
            const newEdited = { ...editedRows }
            delete newEdited[id]
            setEditedRows(newEdited)
        } catch (error) {
            toast.error("Update failed", { id: loadingToast })
        }
    }

    const [exporting, setExporting] = useState(false);
    const handleExport = async () => {
        setExporting(true);

        try {
            const response = await exportServiceCenter();

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const fileName = `Service_Centers_${new Date().toLocaleDateString()}.xlsx`;
            link.setAttribute('download', fileName);

            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            toast.dismiss();
            toast.success("Downloaded successfully!");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export Excel file");
        } finally {
            setExporting(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const loadingToast = toast.loading("Importing data...");
        try {
            await importServiceCenter(file);
            toast.success("All Service Centers imported successfully!", { id: loadingToast });
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Import failed", { id: loadingToast });
        }
    };

    const renderInput = (s: ServiceCenter, field: keyof ServiceCenter, placeholder: string) => {
        const value = editedRows[String(s.ID)]?.[field] ?? (s[field] as string)

        // Jika field adalah address, gunakan textarea
        if (field === 'address') {
            return (
                <textarea
                    className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white outline-none p-1 transition-all resize-none overflow-hidden min-h-[60px]"
                    value={value || ''}
                    placeholder={placeholder}
                    rows={3}
                    onChange={(e) => handleInputChange(String(s.ID), field, e.target.value)}
                />
            )
        }

        return (
            <input
                className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white outline-none p-1 transition-all"
                value={value || ''}
                placeholder={placeholder}
                onChange={(e) => handleInputChange(String(s.ID), field, e.target.value)}
            />
        )
    }

    const handleUpdateBulk = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const loadingToast = toast.loading("Processing Excel data...");

        try {
            const response = await updateBulkServiceCenter(file);
            toast.success(response.data.message, {
                id: loadingToast,
                duration: 5000
            });
            e.target.value = '';
        } catch (error: any) {
            toast.error("Failed to process file", { id: loadingToast });
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this location?")) return;

        try {
            await deleteServiceCenter(id);
            toast.success("Location removed");
            fetchServiceCenters()
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    return (
        <section className="w-full h-full bg-gray-50">
            <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-white">
                    <div className="flex gap-2 w-full md:w-auto">
                        {isSystem && (
                            <>
                                <div className="flex gap-2">
                                    <label className="flex items-center gap-2 p-2 bg-yellow-100/20 text-yellow-700 rounded-md cursor-pointer hover:bg-yellow-200/20 border border-yellow-300 text-sm">
                                        <RiRefreshLine size={18} />
                                        Update
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".xlsx, .xls"
                                            onChange={handleUpdateBulk}
                                        />
                                    </label>
                                </div>
                                <label
                                    className="flex items-center gap-2 p-2 text-orange-700 bg-orange-100/20 hover:bg-orange-200/20 rounded-lg border border-orange-300 text-sm"
                                >
                                    <RiUploadCloud2Line size={20} />
                                    Import
                                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
                                </label>
                                <button
                                    onClick={handleExport}
                                    className="flex gap-1 items-center p-2 text-green-700 bg-green-100/20 hover:bg-green-200/20 rounded-lg border border-green-300 text-sm"
                                    title="Export"
                                >
                                    <HiDownload size={20} /> {exporting ? 'Loading...' : 'Export'}
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full md:w-96">
                            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <button onClick={fetchServiceCenters} className="px-4 py-2 bg-(--z-red) text-white rounded-md text-sm transition-colors cursor-pointer">
                            Search
                        </button>
                        {isSystem && !isAdding && (
                            <button
                                onClick={handleAddNewClick}
                                className="px-4 py-2 bg-red-200/20 border border-(--z-red) text-(--z-red) rounded-md text-sm flex items-center gap-2 cursor-pointer"
                            >
                                + Add New
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-auto max-h-[70vh]">
                    <table className="w-full border-collapse text-xs">
                        <thead className="bg-slate-50 border-b border-gray-200 sticky top-0 z-20">
                            <tr className="text-gray-600 font-medium">
                                <th className="p-3 text-left w-12">ID</th>
                                <th className="p-3 text-left w-48">Branch Name</th>
                                <th className="p-3 text-left w-24">Type</th>
                                <th className="p-3 text-left w-100">Address</th>
                                <th className="p-3 text-left">City</th>
                                <th className="p-3 text-left">Contact</th>
                                <th className="p-3 text-left">PIC</th>
                                <th className="p-3 text-left w-40">Google Maps</th>
                                <th className="p-3 text-center w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isAdding && newRow && (
                                <tr className="bg-green-50 animate-in fade-in duration-300">
                                    <td className="p-3 text-gray-400">New</td>
                                    <td className="p-3">
                                        <input
                                            className="w-full bg-white border border-blue-300 rounded p-1 outline-none"
                                            placeholder="Branch Name"
                                            value={newRow.name}
                                            onChange={(e) => setNewRow({ ...newRow, name: e.target.value })}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <select
                                            className="bg-white border border-blue-300 rounded p-1 outline-none"
                                            value={newRow.branch_type}
                                            onChange={(e) => setNewRow({ ...newRow, branch_type: e.target.value })}
                                        >
                                            <option value="ZSC">ZSC</option>
                                            <option value="ASP">ZSP</option>
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        <textarea
                                            className="w-full bg-white border border-blue-300 rounded p-1 outline-none min-h-[60px]"
                                            placeholder="Address"
                                            value={newRow.address}
                                            onChange={(e) => setNewRow({ ...newRow, address: e.target.value })}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <input className="w-full bg-white border border-blue-300 rounded p-1" placeholder="City" value={newRow.city} onChange={(e) => setNewRow({ ...newRow, city: e.target.value })} />
                                    </td>
                                    <td className="p-3">
                                        <input className="w-full bg-white border border-blue-300 rounded p-1" placeholder="Phone" value={newRow.phone} onChange={(e) => setNewRow({ ...newRow, phone: e.target.value })} />
                                    </td>
                                    <td className="p-3">
                                        <input className="w-full bg-white border border-blue-300 rounded p-1" placeholder="PIC" value={newRow.pic} onChange={(e) => setNewRow({ ...newRow, pic: e.target.value })} />
                                    </td>
                                    <td className="p-3">
                                        <input className="w-full bg-white border border-blue-300 rounded p-1" placeholder="Maps URL" value={newRow.map_url} onChange={(e) => setNewRow({ ...newRow, map_url: e.target.value })} />
                                    </td>
                                    <td className="p-3">
                                        <div className="flex gap-2">
                                            <button onClick={handleCreateRow} className="text-green-600 font-bold hover:underline">Save</button>
                                            <button onClick={() => { setIsAdding(false); setNewRow(null) }} className="text-red-500">Cancel</button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {serviceCenters?.map((s) => {
                                const isDirty = !!editedRows[String(s.ID)];
                                return (
                                    <tr key={s.ID} className={`hover:bg-gray-50 transition-colors ${isDirty ? 'bg-blue-50/30' : ''}`}>
                                        <td className="p-3 text-gray-400">{s.branch_id}</td>
                                        <td className="p-3 font-medium text-gray-700">
                                            {renderInput(s, 'name', 'Branch Name')}
                                        </td>
                                        <td className="p-3">
                                            <select
                                                value={editedRows[String(s.ID)]?.branch_type ?? s.branch_type}
                                                onChange={(e) => handleInputChange(String(s.ID), 'branch_type', e.target.value)}
                                                className="bg-transparent outline-none cursor-pointer"
                                            >
                                                <option value="ZSC">ZSC</option>
                                                <option value="ASP">ZSP</option>
                                            </select>
                                        </td>
                                        <td className="p-3 min-w-[300px]">
                                            {renderInput(s, 'address', 'Full Address')}
                                        </td>
                                        <td className="p-3">
                                            {renderInput(s, 'city', 'City')}
                                        </td>
                                        <td className="p-3">
                                            {renderInput(s, 'phone', 'Phone')}
                                        </td>
                                        <td className="p-3">
                                            {renderInput(s, 'pic', 'PIC Name')}
                                        </td>
                                        <td className="p-3">
                                            {renderInput(s, 'map_url', 'Google Maps')}
                                            <br />
                                            <a target="_blank" href={s.map_url} className="underline text-blue-600">View</a>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex justify-center items-center gap-3">
                                                {isDirty ? (
                                                    <button
                                                        onClick={() => handleUpdateRow(String(s.ID))}
                                                        className="flex items-center gap-1 text-blue-600 font-bold hover:scale-110 transition-transform"
                                                        title="Save Changes"
                                                    >
                                                        <RiSave3Line size={18} /> Update
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDelete(Number(s.ID))}
                                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <FiDelete size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}