import {
    BookingServiceDTO,
    Customer,
    deleteServiceRequest,
    DropdownRange,
    exportServiceForms,
    getCities,
    getCustomer,
    getDropdownRanges,
    getServices,
    importServiceBookings,
    ServiceParts,
    ServiceSearchParams,
    ServiceStatus,
    updateService,
    upsertServiceParts
} from "@/services/cs";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import PaginationControls from "@/components/shared/pagination-controls";
import { RiSearchLine, RiUploadCloud2Line } from "react-icons/ri";
import { useAuth } from "@/contexts/auth-context";
import toast from "react-hot-toast";
import { HiDownload } from "react-icons/hi";
import { uploadToFirebase } from "@/services/firebase";
import { debounce } from "@/utils/debounce";
import { FaSortAmountDown, FaSortAmountUp } from "react-icons/fa";
import { FiDelete } from "react-icons/fi";
import QRCode from "react-qr-code";
import { toPng } from "html-to-image";
import { MdDownload } from "react-icons/md";
import Ticket from "@/components/service/ticket";
import { STATUS_COLORS } from "@/utils/colors";


export default function ServiceRequest() {
    const { user } = useAuth();
    const userDept = user?.department.toLocaleLowerCase()
    const isSystem = userDept?.toLocaleLowerCase() === 'system'
    const userBranchID = user?.branch_id || ''
    const ticketRef = useRef<HTMLDivElement>(null);
    const hiddenScannerRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false)
    const [services, setServices] = useState<BookingServiceDTO[] | null>(null)
    const [editForm, setEditForm] = useState<BookingServiceDTO | null>(null);
    const [queries, setQueries] = useState({ solution: '', customer: '', parts: '', productType: '' });
    const [openDropdown, setOpenDropdown] = useState<'customer' | 'parts' | 'city' | 'productType' | 'solution' | null>(null)
    const [resources, setResources] = useState({
        solutions: [] as DropdownRange[],
        parts: [] as DropdownRange[],
        serviceParts: [] as ServiceParts[],
        productTypes: [] as DropdownRange[],
        customers: [] as Customer[],
        cities: [] as string[],
        selectedService: null as BookingServiceDTO | null,
        activePartsIndex: 0 as number
    });
    const [searchParams, setSearchParams] = useState<ServiceSearchParams>({
        page: 1,
        limit: 50,
        status: '' as ServiceStatus,
        q: '',
        branch_id: isSystem ? '' : userBranchID,
        city: [],
        service_type: '',
        sort_form_date: 'asc',
        agent: user?.username || ''
    })
    const [copied, setCopied] = useState(false);

    const handleChangeProductType = (e: ChangeEvent<HTMLInputElement>) => {
        setQueries(prev => ({ ...prev, productType: e.target.value }));
        debouncedFetchDropdownRanges('product_type', e.target.value);
        setOpenDropdown('productType');
    }

    const handleCityToggle = (cityName: string) => {
        setSearchParams((prev) => {
            const currentCities = prev.city || [];
            const isSelected = currentCities.includes(cityName);

            return {
                ...prev,
                city: isSelected
                    ? currentCities.filter((c) => c !== cityName) // Hapus jika sudah ada
                    : [...currentCities, cityName]                // Tambah jika belum ada
            };
        });
        console.log(searchParams)
    };

    const fetchCustomers = async (q?: string) => {
        try {
            const res = await getCustomer(q || '')
            setResources(prev => ({ ...prev, customers: res.data.data }))
        } catch (error) {
            console.error("Failed to fetch customers")
        }
    }

    const debouncedFetchCustomers = useCallback(
        debounce((q: string) => {
            fetchCustomers(q)
        }, 500),
        []
    )

    const fetchCities = async () => {
        try {
            const res = await getCities()
            setResources(prev => ({ ...prev, cities: res.data.data }))
        } catch (error) {
            console.error("Failed to fetch cities")
        }
    }

    const fetchServices = async () => {
        setLoading(true)
        try {
            const res = await getServices(searchParams)
            setServices(res.data.data)
        } catch (error) {
            console.error("Failed to fetch services", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchDropdownRanges = async (type: string, q: string) => {
        const res = await getDropdownRanges(type, q)
        if (type === 'solution') {
            setResources(prev => ({ ...prev, solutions: res.data.data }))
        }
        if (type === 'parts') {
            setResources(prev => ({ ...prev, parts: res.data.data }))
        }
        if (type === 'product_type') {
            console.log(res.data.data)
            setResources(prev => ({ ...prev, productTypes: res.data.data }))
        }
    }

    const debouncedFetchDropdownRanges = useCallback(
        debounce((type: string, q: string) => {
            fetchDropdownRanges(type, q)
        }, 500),
        []
    )

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;

        const targetId = e.currentTarget.id;

        switch (targetId) {
            case 'parts':
                fetchDropdownRanges('parts', queries.parts);
                break;
            case 'solution':
                fetchDropdownRanges('solution', queries.solution);
                break;
            case 'customer':
                fetchCustomers();
                break;
            case 'main-search':
                fetchServices();
                break;
            default:
                fetchServices();
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const loadingToast = toast.loading("Importing data...");
        try {
            await importServiceBookings(file);
            toast.success("Imported successfully!", { id: loadingToast });
            fetchServices();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Import failed", { id: loadingToast });
        }
    };

    const handleExport = async () => {
        try {
            const response = await exportServiceForms();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const fileName = `Service Form ${new Date().toLocaleDateString()}.xlsx`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            toast.dismiss();
            toast.success("Downloaded successfully!");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export Excel file");
        }
    };

    const handleInputChange = (field: keyof BookingServiceDTO, value: any) => {
        setEditForm(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSaveUpdate = async () => {
        if (!editForm) return;

        // if (JSON.stringify(editForm) === JSON.stringify(resources.selectedService)) {
        //     toast.success("Nothing changed.")
        //     return
        // };

        try {
            await updateService(editForm)
            await handleUpsertServiceParts()
            toast.success("Service data updated!")
            fetchServices();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update')
        }
    };

    const handlePartChange = (index: number, field: keyof ServiceParts, value: any) => {
        setResources(prev => {
            const updatedParts = [...prev.serviceParts];
            if (updatedParts[index]) {
                updatedParts[index] = { ...updatedParts[index], [field]: value };
            }
            return { ...prev, serviceParts: updatedParts };
        });
    };

    const handleAddPart = () => {
        const newPart: ServiceParts = {
            ID: 0, // 0 menandakan data baru untuk backend-go
            ticket_id: resources.selectedService?.ticket_id || "",
            part_name: "",
            quantity: 1,
            remarks: ""
        };
        setResources(prev => ({ ...prev, serviceParts: [...prev.serviceParts, newPart] }));
    };

    const handleRemovePart = (index: number) => {
        setResources(prev => ({ ...prev, serviceParts: prev.serviceParts.filter((_, i) => i !== index) }));
    };

    const handleUpsertServiceParts = async () => {
        try {
            await upsertServiceParts(resources.serviceParts);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update parts");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this request?")) return;

        try {
            await deleteServiceRequest(id);
            toast.success("Service request removed");
            fetchServices();
        } catch (error) {
            toast.error("Failed to delete");
        } finally {
            setResources(prev => ({ ...prev, selectedService: null }))
        }
    };

    const downloadTicketImage = async () => {
        if (ticketRef.current === null) return;

        try {
            const dataUrl = await toPng(ticketRef.current, {
                cacheBust: true,
                backgroundColor: '#ffffff', // Pastikan background putih saat didownload
                pixelRatio: 3, // Makin tinggi makin tajam. 2 atau 3 biasanya sudah sangat jernih (Retina quality)
                style: {
                    padding: '40px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }
            });
            const link = document.createElement('a');
            link.download = `Zyrex-Ticket-${editForm?.ticket_id || ''}.png`;
            link.href = dataUrl;
            link.click();
            toast.success("Ticket downloaded!");
        } catch (err) {
            console.error('oops, something went wrong!', err);
            toast.error("Failed to download image");
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);

        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        fetchDropdownRanges('solution', queries.solution)
        fetchDropdownRanges('parts', queries.parts)
        fetchCustomers()
        fetchCities()
    }, [])

    useEffect(() => {
        hiddenScannerRef.current?.focus();
        setEditForm(resources.selectedService);
        setResources(prev => ({ ...prev, serviceParts: resources.selectedService?.service_parts || [] }))
    }, [resources.selectedService]);

    useEffect(() => {
        fetchServices()
    }, [searchParams.limit, searchParams.page, searchParams.status, searchParams.city, searchParams.service_type, searchParams.sort_form_date])

    return (
        <div className="w-full h-full flex overflow-hidden">
            <div
                className={`${resources.selectedService ? 'w-[65%]' : 'w-full'} h-full flex flex-col transition-all duration-300`}>
                <div className="p-2 gap-2 flex justify-between items-start bg-white border-b thin-scrollbar">
                    <div className="flex gap-3">
                        <div className="flex flex-col gap-1 text-sm text-gray-600">
                            {/* <span className="text-[12px]">Status</span> */}
                            <select
                                className="border border-gray-200 p-2 h-10 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchParams.status}
                                onChange={(e) => setSearchParams((prev) => ({ ...prev, status: e.target.value as ServiceStatus }))}
                            >
                                <option value="" className="text-gray-400">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="contacted">Contacted</option>
                                <option value="responded">Cust. Responded</option>
                                <option value="ongoing">Ongoing Service</option>
                                <option value="completed">Completed</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-gray-600">
                            <div className="relative">
                                <div
                                    onClick={() => setOpenDropdown('city')}
                                    className={`border ${openDropdown === 'city' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'} p-2 min-h-10 w-52 rounded-md bg-white flex flex-wrap gap-1 cursor-pointer items-center pr-8 transition-all`}
                                >
                                    {searchParams.city.length === 0 ? (
                                        <span className="text-gray-700">All Cities</span>
                                    ) : (
                                        searchParams.city.map((c) => (
                                            <span key={c} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] flex items-center font-bold">
                                                {c}
                                            </span>
                                        ))
                                    )}
                                    <div className={`absolute right-2 top-3 text-gray-400 ${openDropdown === 'city' ? 'rotate-180' : ''}`}>
                                        ▼
                                    </div>
                                </div>
                                {openDropdown === 'city' && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setOpenDropdown(null)}
                                        />
                                        <div className="absolute z-50 top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto thin-scrollbar">
                                            <div className="space-y-1">
                                                {resources.cities?.map((c) => (
                                                    <label
                                                        key={c}
                                                        className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            checked={searchParams.city.includes(c)}
                                                            onChange={() => handleCityToggle(c)}
                                                        />
                                                        <span className="text-gray-700 text-sm">{c}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-gray-600">
                            {/* <span className="text-[12px]">Type</span> */}
                            <select
                                className="border border-gray-200 p-2 h-10 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchParams.service_type}
                                onChange={(e) => setSearchParams((prev) => ({ ...prev, service_type: e.target.value }))}
                            >
                                <option value="" className="text-gray-400">All Type</option>
                                <option value="BOOKING">BOOKING</option>
                                <option value="ONSITE">ONSITE</option>
                                <option value="WALKIN">WALK IN</option>
                                <option value="ZSC">ZSC</option>
                                <option value="PARTNER">PARTNER</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 h-fit">
                        <div className="relative w-52">
                            <button onClick={fetchServices}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-(--z-red) text-white rounded-md transition-colors">
                                <RiSearchLine size={16} />
                            </button>
                            <input
                                id="main-search"
                                autoComplete="off"
                                type="text"
                                placeholder="Search..."
                                value={searchParams.q}
                                onChange={(e) => setSearchParams((prev) => ({ ...prev, q: e.target.value }))}
                                onKeyDown={handleKeyDown}
                                className="w-full pl-3 pr-10 py-2 h-10 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm"
                            />
                        </div>
                        <PaginationControls searchParams={searchParams} setSearchParams={setSearchParams} />
                        <div className="flex gap-2">
                            <label
                                className="flex gap-2 items-center px-2 h-9 text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors border border-orange-200 cursor-pointer text-sm">
                                <RiUploadCloud2Line size={16} />
                                {/* Import */}
                                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
                            </label>
                            <button
                                onClick={handleExport}
                                className="flex gap-1 items-center px-2 h-9 text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors border border-green-200 cursor-pointer text-sm"
                                title="Export"
                            >
                                <HiDownload size={18} />
                                {/* {exporting ? 'Loading...' : 'Export'} */}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto thin-scrollbar">
                    <table className="w-full border-collapse text-xs">
                        <thead className="bg-gray-800 text-white sticky top-0 z-10 whitespace-nowrap">
                            <tr>
                                <th className="p-3 text-left">No</th>
                                <th className="p-3 text-left">Ticket ID</th>
                                <th className="p-3 text-left" onClick={() => {
                                    if (searchParams.sort_form_date === 'asc') {
                                        setSearchParams(prev => ({ ...prev, sort_form_date: 'desc' }))
                                    } else {
                                        setSearchParams(prev => ({ ...prev, sort_form_date: 'asc' }))
                                    }
                                }}>
                                    <div className="flex gap-2 items-center">
                                        Created Date
                                        {searchParams.sort_form_date === 'desc' ? <FaSortAmountDown /> : <FaSortAmountUp />}
                                    </div>
                                </th>
                                <th className="p-3 text-left">Service Date</th>
                                <th className="p-3 text-left">Finished Date</th>
                                <th className="p-3 text-left">RO ID</th>
                                <th className="p-3 text-left">Status</th>
                                <th className="p-3 text-left">Service Type</th>
                                <th className="p-3 text-left">Customer</th>
                                <th className="p-3 text-left">Product SN</th>
                                <th className="p-3 text-left">SLA</th>
                                <th className="p-3 text-left">AGENT</th>
                                <th className="p-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 whitespace-nowrap bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="p-10 text-center">Loading data...</td>
                                </tr>
                            ) : services?.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-10 text-center text-gray-400">No requests found.</td>
                                </tr>
                            ) : (
                                services?.map((s, i) => (
                                    <tr
                                        key={s.ID}
                                        onClick={() => setResources(prev => ({ ...prev, selectedService: s }))}
                                        className={`border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer ${resources.selectedService?.ID === s.ID ? 'bg-blue-50 font-medium' : ''}`}
                                    >
                                        <td className="p-3 text-gray-400">{(searchParams.page - 1) * searchParams.limit + (i + 1)}</td>
                                        <td className="p-3">
                                            {s.ticket_id}
                                            <br />
                                            <span className="text-[10px] text-gray-400">{s.ID}</span>
                                        </td>
                                        <td className="p-3">{formatDate(s.form_date)}</td>
                                        <td className="p-3">{formatDate(s.service_date) || "-"}</td>
                                        <td className="p-3">{formatDate(s.finished_date)}</td>
                                        <td className="p-3">{s.roid || '-'}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[s.service_status] || 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                                {s.service_status}
                                            </span>
                                        </td>
                                        <td className="p-3">{s.service_type}</td>
                                        <td className="p-3">{s.name}</td>
                                        <td className="p-3 font-mono text-blue-600">{s.product_sn}</td>
                                        <td className="p-3">{s.sla || '-'}</td>
                                        <td className="p-3">{s.agent || '-'}</td>
                                        <td className="p-3">
                                            <button
                                                className="flex gap-1 items-center text-red-500 hover:underline hover:cursor-pointer"
                                                onClick={() => handleDelete(Number(s.ID))}
                                            >
                                                <FiDelete /> Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div
                className={`transition-all duration-300 bg-white border-l border-gray-200 flex flex-col shadow-xl ${resources.selectedService ? 'w-[35%]' : 'w-0 overflow-hidden'}`}>
                {editForm && (
                    <>
                        <div className="p-4 flex justify-between items-center bg-blue-100/50">
                            <h3 className="font-bold text-gray-700">Service Detail</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveUpdate}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                                >
                                    SAVE
                                </button>
                                <button onClick={() => setResources(prev => ({ ...prev, selectedService: null }))}
                                    className="text-gray-400 hover:text-red-500 p-1 text-xl">✕
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4 thin-scrollbar">
                            <div className="grid grid-cols-1 gap-4 text-sm">
                                <div className="grid grid-cols-2 gap-6 bg-white rounded-xl">
                                    <div className="flex p-4 flex-col items-center justify-center ">
                                        <QRCode
                                            value={editForm.ticket_id}
                                            size={140}
                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                            viewBox={`0 0 256 256`}
                                        />
                                        <div className="mt-4 text-center">
                                            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Ticket ID</p>
                                            <span className="flex gap-1">
                                                <div className="relative group">
                                                    <p
                                                        onClick={() => handleCopy(editForm.ticket_id)}
                                                        className="text-sm font-mono font-bold px-3 py-1 rounded-full border border-dashed border-gray-300 cursor-pointer hover:bg-gray-100 hover:border-(--z-red) transition-all active:scale-95"
                                                        title="Click to copy"
                                                    >
                                                        {editForm.ticket_id}
                                                    </p>
                                                    {copied && (
                                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg">
                                                            ID Copied!
                                                        </span>
                                                    )}
                                                </div>
                                                <button title="Download Ticket" onClick={downloadTicketImage} className="hover:text-(--z-red) cursor-pointer"><MdDownload size={18} /></button>
                                            </span>
                                            <div className="absolute -left-2499.75 top-0 overflow-hidden">
                                                <Ticket ticketId={editForm.ticket_id} ticketRef={ticketRef} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between py-2">
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex gap-2 items-center mb-1.5 ml-1">
                                                    <label className="text-[10px] uppercase font-bold text-gray-400 block">
                                                        Service Status
                                                    </label>
                                                    <div className={`h-3 w-3 border-4 rounded-full ${STATUS_COLORS[editForm.service_status]}`}></div>
                                                </div>
                                                <div className="relative">
                                                    <select
                                                        value={editForm.service_status}
                                                        onChange={(e) => handleInputChange('service_status', e.target.value)}
                                                        className={`w-full p-2.5 border rounded-lg text-xs font-medium outline-none transition-all focus:ring-2 focus:ring-blue-500/20 border-gray-200 text-gray-700`}
                                                    >
                                                        <option value="pending">PENDING</option>
                                                        <option value="confirmed">CONFIRMED</option>
                                                        <option value="contacted">CONTACTED</option>
                                                        <option value="responded">CUST. RESPONDED</option>
                                                        <option value="ongoing">ONGOING</option>
                                                        <option value="completed">COMPLETED</option>
                                                        <option value="closed">CLOSED</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 ml-1">
                                                    Service Type
                                                </label>
                                                <select
                                                    value={editForm.service_type || ''}
                                                    onChange={(e) => handleInputChange('service_type', e.target.value)}
                                                    className="w-full p-2.5 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                                >
                                                    <option value="">-</option>
                                                    <option value="BOOKING">BOOKING</option>
                                                    <option value="ONSITE">ONSITE</option>
                                                    <option value="WALKIN">WALK IN</option>
                                                    <option value="ZSC">ZSC</option>
                                                    <option value="PARTNER">PARTNER</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 ml-1">
                                                    Assigned Agent
                                                </label>
                                                <select
                                                    value={editForm.agent || ''}
                                                    onChange={(e) => handleInputChange('agent', e.target.value)}
                                                    className="w-full p-2.5 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                                >
                                                    <option value="">-</option>
                                                    <option value="DIVI">DIVI</option>
                                                    <option value="VIRA">VIRA</option>
                                                    <option value="MARITA">MARITA</option>
                                                    <option value="ATIK">ATIK</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 border-t border-gray-300 pt-4">
                                    <EditItem
                                        label="Created Date"
                                        type="date"
                                        value={formatDateForInput(editForm.form_date)}
                                        onChange={(v) => handleInputChange('form_date', v)}
                                    />
                                    <EditItem
                                        label="Closed Date"
                                        type="date"
                                        value={formatDateForInput(editForm.finished_date)}
                                        onChange={(v) => handleInputChange('finished_date', v)}
                                    />
                                    <EditItem
                                        label="Service Date"
                                        type="date"
                                        value={formatDateForInput(editForm.service_date)}
                                        onChange={(v) => handleInputChange('service_date', v)}
                                    />
                                </div>

                                {/* Customer Info */}
                                <div className="border-t border-gray-300 pt-4">
                                    <label className="text-[10px] font-bold text-blue-600 mb-2 block">CUSTOMER
                                        INFORMATION</label>
                                    <div className="flex items-center pb-2">
                                        <p className="text-sm mr-2">Customer:</p>
                                        <div className="flex flex-col relative w-full">
                                            <div className="relative">
                                                <input
                                                    autoComplete="off"
                                                    id="customer"
                                                    className={`p-2 text-gray-800 bg-transparent border-b border-b-gray-300 focus:border-blue-500 outline-none w-full`}
                                                    type="text"
                                                    placeholder="Search customer"
                                                    value={openDropdown === 'customer' ? queries.customer : editForm.name}
                                                    onKeyDown={handleKeyDown}
                                                    onFocus={() => setOpenDropdown('customer')}
                                                    onChange={(e) => {
                                                        setQueries(prev => ({ ...prev, customer: e.target.value }))
                                                        if (e.target.value.length > 2) {
                                                            debouncedFetchCustomers(e.target.value)
                                                        }
                                                    }}
                                                />
                                            </div>
                                            {openDropdown === 'customer' && resources.customers && resources.customers.length > 0 && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 bg-transparent z-10"
                                                        onMouseDown={() => setOpenDropdown(null)}
                                                    />
                                                    <div className="absolute top-[105%] left-0 w-full max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-2xl z-50 custom-scrollbar pointer-events-auto">
                                                        {resources.customers.map((s, i) => (
                                                            <div
                                                                key={i}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleInputChange('name', s.name);
                                                                    handleInputChange('address', s.address);
                                                                    handleInputChange('phone_number', s.phone_number);
                                                                    handleInputChange('email', s.email);
                                                                    setOpenDropdown(null);
                                                                    setQueries(prev => ({ ...prev, customer: '' }))
                                                                }}
                                                                className="p-3 hover:bg-red-50 cursor-pointer border-b border-gray-50 last:border-none flex flex-col gap-0.5"
                                                            >
                                                                <p className="font-bold text-gray-800">{s.name}</p>
                                                                <p className="text-[12px] text-gray-500">{s.email} • {s.city}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <EditItem label="Email" value={editForm.email}
                                        onChange={(v) => handleInputChange('email', v)} />
                                    <EditItem label="Phone" value={editForm.phone_number}
                                        onChange={(v) => handleInputChange('phone_number', v)} />
                                    <EditItem label="City" value={editForm.city}
                                        onChange={(v) => handleInputChange('city', v)} />
                                    <EditItem label="Location" value={editForm.address}
                                        onChange={(v) => handleInputChange('address', v)} />
                                    <EditItem label="PIC/Partner" value={editForm.partner}
                                        onChange={(v) => handleInputChange('partner', v)} />
                                </div>

                                {/* Product Info */}
                                <div className="border-t border-gray-300 pt-4 bg-gray-50/50 p-3 rounded">
                                    <label className="text-[10px] font-bold text-blue-600 mb-2 block">PRODUCT &
                                        WARRANTY</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <EditItem label="Serial Number" value={editForm.product_sn}
                                            onChange={(v) => handleInputChange('product_sn', v)}
                                            className="font-mono" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">Product Type</span>
                                            <div className="relative">
                                                <input
                                                    autoComplete="off"
                                                    className="w-full p-2 bg-white border border-gray-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                                    placeholder="Search..."
                                                    value={openDropdown == 'productType' ? queries.productType : editForm.product_type || ''}
                                                    onChange={(e) => handleChangeProductType(e)}
                                                    onFocus={() => setOpenDropdown('productType')}
                                                />
                                                {openDropdown == 'productType' && resources.productTypes && resources.productTypes.length > 0 && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                                                        <div className="absolute top-full left-0 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-xl z-50 mt-1">
                                                            {resources.productTypes?.map((s, i) => (
                                                                <div
                                                                    key={i}
                                                                    onMouseDown={() => {
                                                                        handleInputChange('product_type', s.text)
                                                                        setOpenDropdown(null)
                                                                    }}
                                                                    className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none"
                                                                >
                                                                    <p className="text-xs text-gray-800">{s.text}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <EditItem label="Warranty" value={editForm.warranty_status}
                                            onChange={(v) => handleInputChange('warranty_status', v)} />
                                        <EditItem
                                            label="Purchase Date"
                                            type="date"
                                            value={formatDateForInput(editForm.purchased_date)}
                                            onChange={(v) => handleInputChange('purchased_date', v)}
                                        />
                                    </div>
                                </div>

                                {/* Service Details */}
                                <div className="border-t border-gray-300 pt-4">
                                    <label className="text-[10px] font-bold text-blue-600 mb-2 block">SERVICE
                                        PROGRESS</label>
                                    <EditItem label="RO ID" value={editForm.roid}
                                        onChange={(v) => handleInputChange('roid', v)} />
                                    <div className="mb-3">
                                        <label
                                            className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Technician</label>
                                        <select
                                            value={editForm.technician_name || ''}
                                            onChange={(e) => handleInputChange('technician_name', e.target.value)}
                                            className="w-full p-2 border border-gray-200 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-</option>
                                            <option value="AGRES">AGRES</option>
                                            <option value="AKMAL">AKMAL</option>
                                            <option value="AWAL">AWAL</option>
                                            <option value="BAGUS">BAGUS</option>
                                            <option value="CUST">CUST</option>
                                            <option value="DANANG">DANANG</option>
                                            <option value="DANI">DANI</option>
                                            <option value="DATASCRIP">DATASCRIP</option>
                                            <option value="EKO">EKO</option>
                                            <option value="FAARIS">FAARIS</option>
                                            <option value="FACHTUR">FACHTUR</option>
                                            <option value="FAJAR">FAJAR</option>
                                            <option value="FITRA">FITRA</option>
                                            <option value="HENDRIK">HENDRIK</option>
                                            <option value="INDRA">INDRA</option>
                                            <option value="ITSC">ITSC</option>
                                            <option value="KLIKCARE">KLIKCARE</option>
                                            <option value="LUDI">LUDI</option>
                                            <option value="MIP">MIP</option>
                                            <option value="MULTI">MULTI</option>
                                            <option value="RAJA">RAJA</option>
                                            <option value="RISKI">RISKI</option>
                                            <option value="SAIFUDIN">SAIFUDIN</option>
                                            <option value="SAMURI">SAMURI</option>
                                        </select>
                                    </div>
                                    <EditItem label="Complaints" value={editForm.complaints}
                                        onChange={(v) => handleInputChange('complaints', v)} isTextArea />
                                    <EditItem label="RO Solution" value={editForm.solution_ro}
                                        onChange={(v) => handleInputChange('solution_ro', v)} isTextArea />
                                    <div className="flex gap-2 items-center justify-between">
                                        <div className="flex flex-col relative w-full">
                                            <div className="relative">
                                                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Solution</label>
                                                <input
                                                    autoComplete="off"
                                                    id="solution"
                                                    className={`p-2 bg-white w-full border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none`}
                                                    type="text"
                                                    placeholder={`Search or Enter Solutions...`}
                                                    value={openDropdown === 'solution' ? queries.solution : editForm.solution || ''}
                                                    onKeyDown={handleKeyDown}
                                                    onFocus={() => setOpenDropdown('solution')}
                                                    onChange={(e) => {
                                                        setQueries(prev => ({ ...prev, solution: e.target.value }))
                                                        debouncedFetchDropdownRanges('solution', e.target.value)
                                                    }}
                                                />
                                            </div>
                                            {openDropdown == 'solution' && resources.solutions && resources.solutions.length > 0 && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 bg-transparent z-10"
                                                        onMouseDown={() => setOpenDropdown(null)}
                                                    />

                                                    <div className="absolute top-[105%] left-0 w-full max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-2xl z-50 custom-scrollbar pointer-events-auto">
                                                        {resources.solutions.map((s, i) => (
                                                            <div
                                                                key={i}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleInputChange('solution', s.text);
                                                                    handleInputChange('h_nh', s.h_nh);
                                                                    setOpenDropdown(null);
                                                                    setQueries(prev => ({ ...prev, solution: '' }))
                                                                }}
                                                                className="p-3 hover:bg-red-50 cursor-pointer border-b border-gray-50 last:border-none flex flex-col gap-0.5"
                                                            >
                                                                <p className="text-gray-800 text-sm pointer-events-none flex gap-2 items-center justify-between">
                                                                    {s.text}
                                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${s.h_nh === 'H' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-blue-50 border-blue-200 text-blue-600'
                                                                        }`}>
                                                                        {s.h_nh}
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] w-20 uppercase font-bold text-gray-400 block mb-1">H /
                                                NH</label>
                                            <select
                                                name="hnh"
                                                id="hnh"
                                                value={editForm.h_nh || ''}
                                                onChange={(e) => handleInputChange('h_nh', e.target.value)}
                                                className="w-full border border-gray-200 h-10 rounded-md"
                                            >
                                                <option value="">-</option>
                                                <option value="H">H</option>
                                                <option value="NH">NH</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-300 pt-4 mt-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Service Parts</label>
                                    </div>

                                    <div className="space-y-3">
                                        {resources.serviceParts.length === 0 ? (
                                            <div className="text-center py-6 text-gray-400 text-sm">
                                                No parts added yet.
                                            </div>
                                        ) : (
                                            resources.serviceParts.map((p, i) => (
                                                <div key={i}
                                                    className="flex items-start gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100 relative group">
                                                    <div className="flex-1 mb-3">
                                                        {/* <EditItem label={`PART ${i + 1}`} value={p.part_name} disabled className="disabled:bg-white disabled:text-gray-800" /> */}
                                                        <div className="flex flex-col relative">
                                                            <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">{`PART ${i + 1}`}</label>
                                                            <div className="relative">
                                                                <input
                                                                    autoComplete="off"
                                                                    id="parts"
                                                                    className={`p-2 w-full bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none`}
                                                                    type="text"
                                                                    placeholder={"Search parts"}
                                                                    value={openDropdown === 'parts' && resources.activePartsIndex === i ? queries.parts : p.part_name}
                                                                    onKeyDown={handleKeyDown}
                                                                    onFocus={() => {
                                                                        setResources(prev => ({ ...prev, activePartsIndex: i }))
                                                                        setOpenDropdown('parts')
                                                                    }}
                                                                    onChange={(e) => {
                                                                        setQueries((prev) => ({ ...prev, parts: e.target.value }))
                                                                        debouncedFetchDropdownRanges('parts', e.target.value)
                                                                    }}
                                                                />
                                                            </div>
                                                            {openDropdown === 'parts' && resources.parts && resources.activePartsIndex === i && resources.parts.length > 0 && (
                                                                <>
                                                                    <div
                                                                        className="fixed inset-0 bg-transparent z-10"
                                                                        onMouseDown={() => setOpenDropdown(null)}
                                                                    />
                                                                    <div className="absolute top-[105%] left-0 w-full max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-2xl z-50 custom-scrollbar pointer-events-auto">
                                                                        {resources.parts.map((s, index) => (
                                                                            <div
                                                                                key={`${s.text}-${index}`}
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    handlePartChange(i, 'part_name', s.text);
                                                                                    setOpenDropdown(null);
                                                                                    setQueries(prev => ({ ...prev, parts: '' }))
                                                                                }}
                                                                                className="p-3 hover:bg-red-50 cursor-pointer border-b border-gray-50 last:border-none flex flex-col gap-0.5"
                                                                            >
                                                                                <p className="text-gray-800 text-sm pointer-events-none">{s.text}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="w-20">
                                                        <EditItem
                                                            label="QTY"
                                                            type="number"
                                                            value={p.quantity}
                                                            onChange={(v) => handlePartChange(i, 'quantity', parseInt(v) || 0)}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemovePart(i)}
                                                        className="mb-3 p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                        title="Remove Part"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <button
                                        onClick={handleAddPart}
                                        className="w-full mt-3 py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs font-bold text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all"
                                    >
                                        + Add More Parts
                                    </button>
                                </div>

                                <EditItem label="Remarks (Keterangan)" value={editForm.service_remarks}
                                    onChange={(v) => handleInputChange('service_remarks', v)} isTextArea />
                                <div className="mt-4">
                                    <EditItem label="Mac Address Lama" value={editForm.mac_adr_old} onChange={(v) => handleInputChange('mac_adr_old', v)} />
                                    <EditItem label="Mac Address Baru" value={editForm.mac_adr_new} onChange={(v) => handleInputChange('mac_adr_new', v)} />
                                </div>

                                <EditItem
                                    label={`RO Support (Image/PDF)`}
                                    type="file"
                                    value={editForm.ro_support}
                                    onFileChange={async (file) => {
                                        setLoading(true)
                                        try {
                                            const url = await uploadToFirebase(file, 'cs');
                                            handleInputChange('ro_support', url);
                                        } catch (error) {
                                            console.error("Upload failed:", error);
                                            alert("Failed to upload image");
                                        } finally {
                                            setLoading(false)
                                        }
                                    }}
                                />
                                {loading && (
                                    <p className="text-blue-500 text-end">Uploading...</p>
                                )}

                                {/* Admin/Internal */}
                                <div className="border-t border-gray-300 pt-4 grid grid-cols-1 gap-2">
                                    <EditItem label="SLA / ETR" value={editForm.sla}
                                        onChange={(v) => handleInputChange('sla', v)} />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div >
    )
}

const formatDateForInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0]; // Menghasilkan "YYYY-MM-DD"
};

function EditItem({
    label,
    value,
    onChange,
    onFileChange,
    disabled,
    isTextArea,
    type = "text",
    className
}: {
    label: string,
    value?: any,
    onChange?: (v: string) => void,
    onFileChange?: (file: File) => void,
    disabled?: boolean,
    isTextArea?: boolean,
    type?: "text" | "date" | "number" | "file",
    className?: string
}) {
    const isImage = typeof value === 'string' && (value.match(/\.(jpeg|jpg|gif|png|webp)/i) || value.includes("image"));
    const isPdf = typeof value === 'string' && (value.match(/\.(pdf)/i) || value.includes("pdf"));

    return (
        <div className="mb-3">
            <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">{label}</label>

            {isTextArea ? (
                <textarea
                    className={`w-full p-2 bg-white border border-gray-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 min-h-20 ${className}`}
                    value={value || ''}
                    onChange={(e) => onChange?.(e.target.value)}
                />
            ) : type === "file" ? (
                <div className="flex flex-col gap-3">
                    {value && (
                        <div className="relative w-full aspect-video bg-gray-100 border border-gray-200 rounded-md overflow-hidden group">
                            {isImage ? (
                                <img
                                    src={value}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            ) : isPdf ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
                                    <span className="text-red-500 font-bold text-xs">PDF</span>
                                    <span className="text-[10px] text-gray-400 mt-1 uppercase">Document</span>
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                    No Preview
                                </div>
                            )}
                            <a
                                href={value}
                                target="_blank"
                                rel="noreferrer"
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-medium"
                            >
                                Open File
                            </a>
                        </div>
                    )}

                    <input
                        type="file"
                        disabled={disabled}
                        accept=".jpg,.jpeg,.png,.pdf,.webp"
                        className={`w-full p-1.5 bg-white border border-gray-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer ${className}`}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onFileChange?.(file);
                        }}
                    />
                </div>
            ) : (
                <input
                    autoComplete="off"
                    type={type}
                    disabled={disabled}
                    className={`w-full p-2 bg-white border border-gray-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 ${className}`}
                    value={value || ''}
                    onChange={(e) => onChange?.(e.target.value)}
                />
            )}
        </div>
    );
}

const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};