'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingServiceDTO, getServices, ServiceSearchParams, ServiceStatus, updateService } from '@/services/cs';
import { formatDate } from '@/utils/string';
import { FaPrint } from "react-icons/fa6";
import { STATUS_COLORS } from '@/utils/colors';
import toast from 'react-hot-toast';

export default function ServiceDocuments() {
    const searchParamsHook = useSearchParams();
    const ticketId = searchParamsHook.get('ticketId');
    const autoprint = searchParamsHook.get('autoprint');

    const [searchParams, setSearchParams] = useState<ServiceSearchParams>({
        page: 1,
        limit: 1,
        q: ticketId || '',
        status: '' as ServiceStatus,
        branch_id: '',
        city: [],
        service_type: '',
        sort_form_date: 'asc',
        agent: ''
    });

    const [services, setServices] = useState<BookingServiceDTO[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchServices = async () => {
        const query = searchParams.q || ticketId;
        if (!query) return;

        setLoading(true);
        try {
            const res = await getServices({ ...searchParams, q: query });
            console.log(res)
            setServices(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };


    const handlePrint = () => {
        window.print()
        if (window.confirm("Is the Document printed successfully?")) {
            // alert("Printed")
            handleSaveUpdate()
        }
    }

    const handleSaveUpdate = async () => {
        if (!services[0]) return;

        try {
            await updateService({ ...services[0], print_copy: (services[0].print_copy || 0) + 1 })
            toast.success("Printed!")
            fetchServices();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update')
        }
    };

    useEffect(() => {
        if (ticketId) {
            fetchServices();

            const url = new URL(window.location.href);
            // url.searchParams.delete('ticketId');
            // url.searchParams.delete('autoprint');
            window.history.replaceState({}, '', url.pathname);
        }
    }, [ticketId]);

    useEffect(() => {
        if (autoprint === 'yes' && services.length > 0 && !loading) {
            const timer = setTimeout(() => {
                window.print();
            }, 700);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <div className="flex h-full bg-gray-100 overflow-hidden print:bg-white print:h-auto print:overflow-visible text-slate-800">

            {/* --- SIDEBAR --- */}
            <aside className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col print:hidden">
                <div className="mb-6">
                    <h2 className="font-semibold text-lg leading-tight">Service Document {autoprint}</h2>
                </div>

                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Search Ticket, SN, RO"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        value={searchParams.q}
                        onChange={(e) => setSearchParams({ ...searchParams, q: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && fetchServices()}
                    />
                    <button
                        onClick={fetchServices}
                        className="w-full bg-(--z-red) py-3 text-white text-sm rounded-md transition-colors"
                    >
                        {loading ? 'Loading...' : 'Show Document'}
                    </button>

                    {services.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-4">
                            {/* Info Card */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                                    Document Details
                                </p>

                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs text-slate-500">Service Status</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shadow-sm ${STATUS_COLORS[services[0].service_status]}`}>
                                        {services[0].service_status}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Print Copies</span>
                                    <span className="text-sm font-mono font-bold text-slate-700 bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm">
                                        {services[0].print_copy}
                                    </span>
                                </div>
                            </div>

                            {/* Print Button */}
                            <button
                                disabled={services[0].service_status !== 'completed' && services[0].service_status !== 'closed'}
                                onClick={handlePrint}
                                className="group relative w-full py-3.5 flex items-center justify-center gap-3 bg-slate-900 text-white text-xs rounded-md hover:bg-black transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed uppercase tracking-widest overflow-hidden"
                            >
                                <FaPrint className="text-sm" />
                                <span>Print</span>

                                {/* Dekorasi efek gloss saat di-hover */}
                                <div className="absolute inset-0 w-1/2 h-full bg-white/5 skew-x-[-25deg] -translate-x-full group-hover:translate-x-[250%] transition-transform duration-700 ease-in-out"></div>
                            </button>

                            {services[0].service_status !== 'completed' && services[0].service_status !== 'closed' && (
                                <p className="text-[10px] text-red-500 italic text-center px-4 leading-snug">
                                    Tombol cetak terkunci karena status servis belum selesai (Completed/Closed).
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* --- MAIN AREA --- */}
            <main className="flex-1 p-12 bg-gray-100 print:overflow-visible print:p-0 print:bg-white flex justify-center overflow-y-auto thin-scrollbar">

                {services.length > 0 ? (
                    <div className="print-section relative bg-white w-[210mm] min-h-[297mm] p-[12mm] shadow-xl print:shadow-none print:w-[210mm] print:h-[297mm] print:m-0 flex flex-col">

                        {/* Header: Dikecilkan sedikit paddingnya */}
                        <div className="flex justify-between items-start border-b border-slate-900 pb-3 mb-5">
                            <div>
                                <h1 className="text-xl font-black text-slate-900 leading-none tracking-tighter">PT. ZYREXINDO MANDIRI BUANA Tbk</h1>
                                <p className="text-[11px] font-bold mt-1 text-slate-600 uppercase tracking-widest">Zyrex Customer Service Division</p>
                                <div className="text-[9px] mt-2 text-slate-500 uppercase leading-tight font-medium">
                                    Jl. Daan Mogot No. 59, Jakarta Barat 11470<br />
                                    Telp: (021) 56941555<br />
                                    Fax: (021) 56941552<br />
                                    Email: cs@zyrex.com
                                </div>
                            </div>
                            <div className="w-1/3 text-right text-[10px] font-semibold space-y-0.5 text-slate-700">
                                <p><span className="text-slate-400 font-normal">Customer:</span> {services[0].name || '-'}</p>
                                <p><span className="text-slate-400 font-normal">Phone:</span> {services[0].phone_number || '-'}</p>
                                <p className="max-w-50 ml-auto italic font-normal text-slate-500 text-[9px] leading-tight">{services[0].address || '-'}</p>
                            </div>
                        </div>

                        {/* WO Info: Layout lebih compact */}
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold mb-3 tracking-tighter">
                                Work Order: {services[0].roid}
                            </h2>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-[10px] uppercase font-bold">
                                <div className="flex justify-between border-b border-gray-100 py-0.5">
                                    <span className="text-slate-400 font-normal">Product:</span>
                                    <span>{services[0].product_type || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 py-0.5">
                                    <span className="text-slate-400 font-normal">Warranty:</span>
                                    <span>{services[0].warranty_status || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 py-0.5">
                                    <span className="text-slate-400 font-normal">Serial Number:</span>
                                    <span className="font-mono tracking-tight">{services[0].product_sn}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 py-0.5">
                                    <span className="text-slate-400 font-normal">Service Date:</span>
                                    <span>{formatDate(services[0].form_date || '')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Content Table: min-h disesuaikan agar tidak mendorong footer ke lembar 2 */}
                        <div className="border border-slate-200 rounded-sm flex flex-col h-60">
                            <div className="grid grid-cols-2 bg-slate-50 font-bold border-b border-slate-200 text-[9px] uppercase tracking-wider">
                                <div className="p-2 border-r border-slate-200">Problems</div>
                                <div className="p-2">Solutions</div>
                            </div>
                            <div className="grid grid-cols-2 h-full text-[12px]">
                                <div className="p-4 border-r border-slate-200 italic leading-snug text-slate-700 whitespace-pre-wrap">
                                    {services[0].complaints}
                                </div>
                                <div className="p-4 italic leading-snug text-slate-700 whitespace-pre-wrap">
                                    {services[0].solution || services[0].solution_ro || "-"}
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex justify-between px-12">
                            <div className="text-center">
                                <p className="text-[9px] text-slate-400 mb-14 uppercase tracking-widest font-bold">Customer</p>
                                <div className="max-w-60 border-t border-slate-900 pt-2 min-w-40 font-bold uppercase text-[11px]">
                                    {services[0].name}
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] text-slate-400 mb-14 uppercase tracking-widest font-bold">Technician / Agent</p>
                                <div className="border-t border-slate-900 pt-2 min-w-40 font-bold uppercase text-[11px]">
                                    {services[0].technician_name || 'SAMURI'}
                                </div>
                            </div>
                        </div>

                        {/* Disclaimer: Berada di paling bawah halaman */}
                        <div className="mt-12 pt-4 border-t border-slate-100">
                            <div className="text-[9px] text-slate-400 italic space-y-1 leading-tight font-medium">
                                <p>• Dokumen ini dihasilkan secara otomatis melalui sistem manajemen layanan PT. Zyrexindo Mandiri Buana.</p>
                                <p>• Customer disarankan untuk melakukan backup data sebelum proses servis. Zyrex tidak bertanggung jawab atas data yang hilang.</p>
                                <p>• Mohon agar tidak memberikan Tips kepada petugas servis kami.</p>
                            </div>
                        </div>
                        {(services[0]?.print_copy ?? 0) > 0 && (
                            <div className="absolute top-24 right-24 border-2 border-slate-300 px-3 py-1 rotate-12 opacity-50 scale-150">
                                <p className="text-xl font-black text-slate-300 uppercase tracking-widest">
                                    {`COPY #${services[0].print_copy}`}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-20 text-slate-400 italic flex flex-col items-center">
                        {/* <div className="w-8 h-8 border-2 border-slate-200 border-t-(--z-red) rounded-full animate-spin mb-4"></div> */}
                        {/* <p className="text-sm font-medium">Menunggu data tiket...</p> */}
                    </div>
                )}
            </main>

            <style jsx global>{`
                @media screen {
                    html, body { overflow: hidden; height: 100%; }
                }

                @media print {
                    /* Sembunyikan semua elemen kecuali print-section */
                    body * { visibility: hidden; }
                    .print-section, .print-section * { visibility: visible; }

                    /* Reset total posisi body & html */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        height: 100%;
                        width: 100%;
                    }

                    /* Reset main container agar tidak memposisikan konten ke tengah */
                    main {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        display: block !important; /* Matikan flexbox alignment */
                        width: 100% !important;
                    }

                    .print-section {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 12mm !important;
                        box-shadow: none !important;
                        border: none !important; /* Hapus border red setelah debug */
                        background: white !important;
                        box-sizing: border-box; /* Pastikan padding tidak menambah lebar */
                    }

                    @page {
                        size: A4;
                        margin: 0; /* Menghilangkan margin default browser */
                    }

                    /* Memastikan background dan garis muncul */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
        </div>
    );
}