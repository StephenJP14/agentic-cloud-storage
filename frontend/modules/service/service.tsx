'use client'

import { useNavStyle } from "@/contexts/navbar-context";
import { BookingServiceDTO, BookServiceAppointment, CreateServicePayload, getServiceStatus } from "@/services/cs";
import { RiCustomerServiceFill, RiSearchLine, RiTimeLine } from "react-icons/ri";
import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { getServiceCenters, ServiceCenter } from "@/services/serviceCenter";
import { generateTicketID } from "@/utils/string";
import { toPng } from "html-to-image";
import { RiDownload2Line } from "react-icons/ri";
import { debounce } from "@/utils/debounce";
import Ticket from "@/components/service/ticket";
import { STATUS_COLORS } from "@/utils/colors";
import { IoMdClose } from "react-icons/io";
import { IoInformationCircleOutline } from "react-icons/io5";

export default function Service() {
    const [query, setQuery] = useState('')
    const [serviceCenters, setServiceCenters] = useState<ServiceCenter[] | null>(null)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showInfo, setShowInfo] = useState(false)
    const { setVariant } = useNavStyle();
    const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
    const [checkTicketId, setCheckTicketId] = useState('');
    const [statusResult, setStatusResult] = useState<BookingServiceDTO | null>(null);
    const [selectedServiceLocation, setSelectedServiceLocation] = useState('');

    const debouncedFetchServiceCenters = useCallback(
        debounce((q: string) => {
            fetchServiceCenters(q)
        }, 500),
        []
    )

    const fetchServiceCenters = async (q?: string) => {
        try {
            const res = await getServiceCenters("ZSC Jakarta")
            setServiceCenters(res.data.data)
        } catch (error) {
            console.error("Failed to fetch:", error)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            fetchServiceCenters()
        }
    }

    const handleSelectCenter = (center: ServiceCenter) => {
        const locationString = `${center.name} | ${center.address}`;
        setSelectedServiceLocation(locationString)
        const ticketId = generateTicketID(center.branch_id)

        setForm(prev => ({
            ...prev,
            branch_id: center.branch_id,
            ticket_id: ticketId
        }));
        setQuery(center.name);
        setIsDropdownOpen(false);
    };

    useEffect(() => {
        setVariant('b');
    }, [setVariant]);

    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<CreateServicePayload>({
        ticket_id: "",
        branch_id: "",
        name: "",
        email: "",
        phone_number: "",
        product_sn: "",
        complaints: "",
        service_date: "",
        address: '',
        service_type: 'BOOKING' // Set to BOOKING for Booking Service
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setForm(prev => ({
            ...prev,
            [id]: value,
        }));
    };

    const handleBooking = async () => {
        if (!form.name || !form.email || !form.service_date || !form.product_sn || !form.address) {
            toast.error("Please fill in all required fields including Location");
            return;
        }

        setLoading(true);
        try {
            const res = await BookServiceAppointment(form);
            if (res.status === 201 || res.data.success) {
                // Simpan ticket ID sebelum form direset
                setSubmittedTicketId(form.ticket_id);
                toast.success("Service appointment booked successfully!");

                // Reset Form
                setForm({
                    name: "", email: "", phone_number: "",
                    product_sn: "", complaints: "", service_date: "",
                    address: '', ticket_id: "", branch_id: "", service_type: "BOOKING"
                });
                setQuery("");
            }
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to book service.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (submittedTicketId) {
            navigator.clipboard.writeText(submittedTicketId);
            toast.success("Ticket ID copied to clipboard!");
        }
    };


    const handleCheckStatus = async () => {
        if (!checkTicketId) return toast.error("Please enter a Ticket ID");

        setLoading(true);
        try {
            const safeTicketId = encodeURIComponent(checkTicketId);
            const res = await getServiceStatus(safeTicketId);

            setStatusResult(res.data.data);
            toast.success("Status retrieved");
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Ticket ID not found.");
            setStatusResult(null);
        } finally {
            setLoading(false);
        }
    };

    const ticketRef = useRef<HTMLDivElement>(null);
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
            link.download = `Zyrex-Ticket-${submittedTicketId}.png`;
            link.href = dataUrl;
            link.click();
            toast.success("Ticket downloaded!");
        } catch (err) {
            console.error('oops, something went wrong!', err);
            toast.error("Failed to download image");
        }
    };

    useEffect(() => {
        fetchServiceCenters()
        setShowInfo(true)
        setTimeout(() => {
            setShowInfo(false)
        }, 6000);
    }, [])

    return (
        <>
            <section className="relative w-full h-[40vh] md:h-[50vh]">
                <img src="/contact.webp" alt="Contact" className="w-full h-full object-cover" />
            </section>

            <section className="px-[6%] md:px-[14%] py-6 md:py-12 relative w-full flex flex-col md:flex-row gap-12 justify-between min-h-[80vh]">
                <div className="flex flex-col gap-4">
                    <h1 className="font-bold text-2xl md:text-4xl md:w-4/5">Your Device, Our Priority</h1>
                    <p className="md:w-2/3 text-gray-600">Book a service, claim your warranty, or get technical support quickly.</p>

                    <div className="flex flex-col gap-4 mt-8">
                        <p className="font-medium text-gray-700">Check Your Service Status:</p>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full md:w-96">
                                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
                                <input
                                    type="text"
                                    placeholder="Search your Ticket ID"
                                    onChange={(e) => setCheckTicketId(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCheckStatus()}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm"
                                />
                            </div>
                            <button
                                onClick={handleCheckStatus}
                                disabled={loading}
                                className="flex-1 md:flex-none px-6 py-2.5 bg-(--z-red) text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 hover:bg-opacity-90"
                            >
                                {loading ? "Searching..." : "Search"}
                            </button>
                        </div>

                        {statusResult && (
                            <div className="max-w-xl mt-8 p-6 bg-white border border-gray-200 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                                {/* Header: Ticket ID & Status Badge */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4 mb-6">
                                    <div>
                                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Ticket ID</p>
                                        <h3 className="text-lg font-bold text-gray-900">{statusResult.ticket_id}</h3>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Service Status</p>
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${STATUS_COLORS[statusResult.service_status]}`}>
                                            <span className="animate-pulse">●</span> {statusResult.service_status}
                                        </span>
                                    </div>
                                </div>

                                {/* Content Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Customer Info */}
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium uppercase">Customer Name</p>
                                            <p className="text-sm font-semibold text-gray-700">{statusResult.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium uppercase">Serial Number (S/N)</p>
                                            <p className="text-sm font-mono font-medium text-gray-700">{statusResult.product_sn}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium uppercase">Complaints</p>
                                            <p className="text-sm text-gray-600 italic">"{statusResult.complaints}"</p>
                                        </div>
                                    </div>

                                    {/* Service Location */}
                                    {/* <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 p-2 bg-white rounded-lg shadow-sm">
                                                <RiMapPin2Line className="text-(--z-red) size-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-medium uppercase">Service Location</p>
                                                <p className="text-xs text-gray-500 leading-relaxed">
                                                    {statusResult.address}
                                                </p>
                                            </div>
                                        </div>
                                    </div> */}
                                </div>

                                {/* Footer Info */}
                                <div className="mt-6 pt-4 border-t border-gray-50 flex flex-wrap gap-4 justify-between">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <RiTimeLine />
                                        <span>
                                            Last Updated: {statusResult?.UpdatedAt ? new Date(statusResult.UpdatedAt).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            }) : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full md:w-120 bg-white md:rounded-xl z-20 md:border border-gray-200 md:p-6 min-h-100 justify-center mt-12 md:mt-0">
                    {submittedTicketId ? (
                        <div className="flex flex-col animate-in fade-in zoom-in duration-300">
                            <Ticket ticketId={submittedTicketId} ticketRef={ticketRef} />

                            <div className="flex flex-col gap-2 mt-4 px-6 pb-6">
                                <button
                                    onClick={downloadTicketImage}
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-all shadow-md"
                                >
                                    <RiDownload2Line size={18} />
                                    Download Ticket
                                </button>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={copyToClipboard}
                                        className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
                                    >
                                        Copy ID
                                    </button>
                                    <button
                                        onClick={() => setSubmittedTicketId(null)}
                                        className="py-3 bg-gray-800 hover:bg-black text-white rounded-md text-sm font-medium"
                                    >
                                        Back to Form
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* FORM SEMULA */
                        <>
                            <h2 className="mb-4 text-xl font-semibold text-center">Book A Service</h2>

                            <div className="grid grid-cols-1 gap-4 text-sm">
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="name" className="text-gray-500 font-medium">Full Name *</label>
                                    <input id="name" className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                                        type="text" value={form.name} onChange={handleChange} placeholder="John Doe" required />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label htmlFor="email" className="text-gray-500 font-medium">Email *</label>
                                    <input id="email" className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                                        type="email" value={form.email} onChange={handleChange} placeholder="john@example.com" required />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label htmlFor="phone_number" className="text-gray-500 font-medium">Phone (WhatsApp) *</label>
                                    <input id="phone_number" className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                                        type="text" value={form.phone_number} onChange={handleChange} placeholder="-" required />
                                </div>

                                <div className="flex flex-col gap-1 relative">
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="location" className="text-gray-500 font-medium">Service Location *</label>

                                        {/* Info Tooltip Section */}
                                        <div className="relative">
                                            <div
                                                onClick={() => setShowInfo(true)}
                                                className="flex gap-1 items-center hover:underline text-xs text-gray-400 cursor-pointer transition-all"
                                            >
                                                Informasi Layanan
                                                <IoInformationCircleOutline size={16} />
                                            </div>

                                            {showInfo && (
                                                <div className="absolute bottom-8 right-0 w-72 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-2xl p-5 rounded-xl z-50 origin-bottom-right transition-all animate-in fade-in zoom-in slide-in-from-bottom-2 duration-600">
                                                    <div className="mb-3 flex justify-between items-center border-b border-gray-100 pb-2">
                                                        <div className="flex items-center gap-2 text-(--z-red)">
                                                            <IoInformationCircleOutline size={20} />
                                                            <p className="font-bold text-sm uppercase tracking-tight">Info</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowInfo(false);
                                                            }}
                                                            className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                                                        >
                                                            <IoMdClose size={18} />
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-xs leading-relaxed text-gray-600">
                                                            Saat ini Booking Service hanya melayani untuk service walk in di <span className="font-bold text-gray-800 underline decoration-(--z-red)/30">ZSC Jakarta</span>.
                                                        </p>
                                                        <div className="h-1 w-12 bg-gray-100 rounded-full" />
                                                        <p className="text-[10px] text-gray-400 italic font-medium">
                                                            *Pusat layanan lain akan segera tersedia.
                                                        </p>
                                                    </div>

                                                    {/* Arrow (Tooltip tail) */}
                                                    <div className="absolute -bottom-2 right-3 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <input
                                            autoComplete="off"
                                            id="location"
                                            className={`p-4 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none transition-all ${form.address ? 'border-yellow-500 bg-yellow-50' : ''}`}
                                            type="text"
                                            placeholder="Search..."
                                            value={isDropdownOpen ? query : selectedServiceLocation}
                                            onKeyDown={handleKeyDown}
                                            onFocus={() => setIsDropdownOpen(true)}
                                            onChange={(e) => {
                                                setQuery(e.target.value)
                                                if (e.target.value.length > 3) {
                                                    debouncedFetchServiceCenters(e.target.value);
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                fetchServiceCenters();
                                                setIsDropdownOpen(true);
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-(--z-red) p-3 rounded-md cursor-pointer hover:bg-red-700 z-10 active:scale-95 transition-transform"
                                        >
                                            <RiSearchLine />
                                        </button>
                                    </div>

                                    {/* Dropdown Logic */}
                                    {isDropdownOpen && serviceCenters && serviceCenters.length > 0 && (
                                        <>
                                            <div
                                                className="fixed inset-0 bg-transparent z-10"
                                                onMouseDown={() => setIsDropdownOpen(false)}
                                            />
                                            <div className="absolute top-[105%] left-0 w-full max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-2xl z-50 custom-scrollbar pointer-events-auto">
                                                {serviceCenters.map((s, i) => (
                                                    <div
                                                        key={i}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleSelectCenter(s);
                                                        }}
                                                        className="p-3 hover:bg-red-50 cursor-pointer border-b border-gray-50 last:border-none flex flex-col gap-0.5"
                                                    >
                                                        <p className="font-bold text-gray-800 text-sm pointer-events-none">{s.name}</p>
                                                        <p className="text-[11px] text-gray-500 leading-tight pointer-events-none">{s.address}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* <div className="flex flex-col gap-1">
                                    <label className="text-gray-500 font-medium">Selected Service Location</label>
                                    <input
                                        className="p-3 border border-gray-300 bg-gray-50 rounded-md text-gray-600 truncate"
                                        value={selectedServiceLocation}
                                        disabled
                                    />
                                </div> */}

                                <div className="flex flex-col gap-1">
                                    <label htmlFor="address" className="text-gray-500 font-medium">Your Address *</label>
                                    <input id="address" className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                                        type="text" value={form.address} onChange={handleChange} placeholder="Your address.." required />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label htmlFor="product_sn" className="text-gray-500 font-medium">Serial Number *</label>
                                    <input id="product_sn" className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                                        type="text" value={form.product_sn} onChange={handleChange} placeholder="SN..." required />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label htmlFor="service_date" className="text-gray-500 font-medium">Service Appointment Date *</label>
                                    <input id="service_date" className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                                        type="date" value={form.service_date} onChange={handleChange} required />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label htmlFor="complaints" className="text-gray-500 font-medium">Complaints / Issues *</label>
                                    <textarea id="complaints" className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none min-h-20"
                                        value={form.complaints} onChange={handleChange} placeholder="Describe the problem..." />
                                </div>
                            </div>

                            <button
                                className="flex gap-2 justify-center items-center p-4 bg-(--z-red) hover:bg-red-700 disabled:bg-gray-400 rounded-md text-white font-semibold cursor-pointer transition-all mt-4"
                                disabled={loading}
                                onClick={handleBooking}
                            >
                                <RiCustomerServiceFill size={20} />
                                {loading ? "Processing..." : "Submit Booking"}
                            </button>
                        </>
                    )}
                </div>
            </section>
        </>
    );
}