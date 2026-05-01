'use client'

import { useState, useEffect, useCallback } from "react";
import { BookServiceAppointment, CreateServicePayload, Customer, DropdownRange, getCustomer, getDropdownRanges } from "@/services/cs";
import toast from "react-hot-toast";
import { RiAddLine, RiFileCopyLine, RiDeleteBin6Line, RiSendPlaneLine, RiSearchLine } from "react-icons/ri";
import { getServiceCenters, ServiceCenter } from "@/services/serviceCenter";
import { generateTicketID } from "@/utils/string";
import { useAuth } from "@/contexts/auth-context";
import { debounce } from "@/utils/debounce";

const STORAGE_KEY_FORM = "bulk_request_form_data";
const STORAGE_KEY_QUERIES = "bulk_request_search_queries";

export default function CreateRequest() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<{ type: 'customer' | 'center' | 'productType', index: number } | null>(null);
    const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
    const [customers, setCustomers] = useState<Customer[] | null>(null);
    const [productTypes, setProductTypes] = useState<DropdownRange[] | null>(null);
    const [customerQuery, setCustomerQuery] = useState('');
    const [productTypeQuery, setProductTypeQuery] = useState('');
    const [formList, setFormList] = useState<CreateServicePayload[]>([]);
    const [searchQueries, setSearchQueries] = useState<string[]>([]);

    useEffect(() => {
        const savedForm = localStorage.getItem(STORAGE_KEY_FORM);
        const savedQueries = localStorage.getItem(STORAGE_KEY_QUERIES);

        if (savedForm && savedQueries) {
            setFormList(JSON.parse(savedForm));
            setSearchQueries(JSON.parse(savedQueries));
        } else {
            setFormList([{
                ticket_id: "", branch_id: "", name: "", email: "",
                phone_number: "", product_sn: "", complaints: "",
                service_date: "", address: '', agent: user?.username, service_type: "", technician_name: "", city: ""
            }]);
            setSearchQueries([""]);
        }
    }, []);

    useEffect(() => {
        if (formList.length > 0) {
            localStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(formList));
            localStorage.setItem(STORAGE_KEY_QUERIES, JSON.stringify(searchQueries));
        }
    }, [formList, searchQueries]);

    const clearSavedData = () => {
        localStorage.removeItem(STORAGE_KEY_FORM);
        localStorage.removeItem(STORAGE_KEY_QUERIES);
    };

    const fetchCustomers = async (query: string) => {
        try {
            const res = await getCustomer(query);
            setCustomers(res.data.data);
        } catch (error) {
            console.error("Failed to fetch customers");
        }
    };

    const debouncedFetchCustomers = useCallback(
        debounce((q: string) => {
            fetchCustomers(q);
        }, 500),
        []
    )

    const fetchProductTypes = async (query: string) => {
        try {
            const res = await getDropdownRanges('product_type', query);
            setProductTypes(res.data.data);
        } catch (error) {
            console.error("Failed to fetch customers");
        }
    };

    const debouncedFetchProductTypes = useCallback(
        debounce((q: string) => {
            fetchProductTypes(q)
        }, 500),
        []
    )

    const fetchServiceCenters = async (q: string) => {
        if (!q) return;
        try {
            const res = await getServiceCenters(q);
            setServiceCenters([
                ...res.data.data,
            ]);
        } catch (error) {
            console.error("Failed to fetch centers:", error);
        }
    };

    const debouncedFetchServiceCenters = useCallback(
        debounce((q: string) => {
            fetchServiceCenters(q)
        }, 500),
        []
    )

    const handleSelectProductType = (index: number, productType: DropdownRange) => {
        const updatedList = [...formList];
        updatedList[index] = {
            ...updatedList[index],
            product_type: productType.text
        };
        setFormList(updatedList);
        setActiveDropdown(null);
        setProductTypeQuery('');
    };

    const handleSelectCustomer = (index: number, data: Customer | ServiceCenter, mode: 'customer' | 'serviceCenter') => {
        const updatedList = [...formList];

        if (mode === 'customer') {
            const customer = data as Customer;
            updatedList[index] = {
                ...updatedList[index],
                name: customer.name,
                email: customer.email,
                phone_number: customer.phone_number,
                address: customer.address,
                city: customer.city
            };
        } else {
            const center = data as ServiceCenter;
            updatedList[index] = {
                ...updatedList[index],
                name: center.name,
                address: center.address,
                phone_number: center.phone,
                city: center.city
            };
        }

        setFormList(updatedList);
        setActiveDropdown(null);
        setCustomerQuery('');
    };

    const handleSelectCenter = (index: number, center: ServiceCenter) => {
        const ticketId = generateTicketID(center.branch_id);
        const updatedList = [...formList];
        updatedList[index] = {
            ...updatedList[index],
            branch_id: center.branch_id,
            ticket_id: ticketId
        };

        const updatedQueries = [...searchQueries];
        updatedQueries[index] = center.name;

        setFormList(updatedList);
        setSearchQueries(updatedQueries);
        setActiveDropdown(null);
    };

    const handleInputChange = (index: number, field: keyof CreateServicePayload, value: string) => {
        const updatedList = [...formList];
        updatedList[index] = { ...updatedList[index], [field]: value };
        setFormList(updatedList);
    };

    const handleLocationSearchChange = (index: number, value: string) => {
        const updatedQueries = [...searchQueries];
        updatedQueries[index] = value;
        setSearchQueries(updatedQueries);

        debouncedFetchServiceCenters(value);
        setActiveDropdown({ type: 'center', index });
    };

    const addNewRow = () => {
        setFormList([...formList, {
            ticket_id: "", branch_id: "", name: "", email: "",
            phone_number: "", product_sn: "", complaints: "",
            service_date: "", address: '', agent: user?.username, service_type: "", technician_name: "", city: ""
        }]);
        setSearchQueries([...searchQueries, ""]);
    };

    const copyRow = (index: number) => {
        const rowToCopy = { ...formList[index] };
        rowToCopy.ticket_id = rowToCopy.branch_id ? generateTicketID(rowToCopy.branch_id) : "";
        setFormList([...formList, rowToCopy]);
        setSearchQueries([...searchQueries, searchQueries[index]]);
    };

    const removeRow = (index: number) => {
        if (formList.length === 1) {
            setFormList([{
                ticket_id: "", branch_id: "", name: "", email: "",
                phone_number: "", product_sn: "", complaints: "",
                service_date: "", address: '', agent: user?.username, service_type: "", technician_name: "", city: ""
            }]);
            setSearchQueries([""]);
            return;
        }
        setFormList(formList.filter((_, i) => i !== index));
        setSearchQueries(searchQueries.filter((_, i) => i !== index));
    };

    const handleBooking = async () => {
        const isValid = formList.every(f => f.name && f.service_date && f.product_sn && f.address && f.ticket_id);
        if (!isValid) {
            toast.error("Please fill all required fields");
            return;
        }

        setLoading(true);
        let successCount = 0;
        const totalRequests = formList.length;

        // Kita gunakan for...of agar bisa await satu per satu dan dapet index/datanya
        for (let i = 0; i < formList.length; i++) {
            const form = formList[i];
            const rowIdentifier = `Row ${i + 1}`;

            try {
                await BookServiceAppointment(form);
                successCount++;
            } catch (e: any) {
                // Toast error spesifik per baris
                const errorMsg = e.response?.data?.message || "Internal Server Error";
                toast.error(`[${rowIdentifier}] Error: ${errorMsg}`, {
                    duration: 5000, // Beri waktu lebih lama agar user sempat baca jika error banyak
                });
            }
        }

        // Feedback final
        if (successCount === totalRequests) {
            toast.success(`Successfully created all ${totalRequests} appointments!`);
            resetForm(); // Pindahkan logika clear data ke fungsi tersendiri agar rapi
        } else if (successCount > 0) {
            toast.loading(`${successCount} successful, ${totalRequests - successCount} failed.`);
        }

        setLoading(false);
    };

    // Fungsi helper untuk reset (opsional agar handleBooking tidak terlalu panjang)
    const resetForm = () => {
        clearSavedData();
        setFormList([{
            ticket_id: "", branch_id: "", name: "", email: "",
            phone_number: "", product_sn: "", complaints: "",
            service_date: "", address: '', agent: user?.username,
            service_type: "", technician_name: "", city: ""
        }]);
        setSearchQueries([""]);
    };

    if (formList.length === 0) return null;

    return (
        <div className="h-[84vh] flex flex-col bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                <div>
                    <h1 className="text-lg font-bold text-gray-800">Bulk Service Request</h1>
                </div>
                <div className="flex gap-3">
                    <button onClick={addNewRow} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-all">
                        <RiAddLine className="text-lg" /> Add Row
                    </button>
                    <button onClick={handleBooking} disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:bg-gray-300 transition-all shadow-md shadow-blue-100">
                        {loading ? "Processing..." : `Submit (${formList.length})`}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50/30">
                <table id="create-request-table" className="w-full text-sm text-left border-separate border-spacing-0">
                    <thead className="sticky top-0 z-40">
                        <tr>
                            <th className="p-4 bg-gray-900 text-white font-semibold border-b border-gray-800 first:rounded-tl-none w-12 text-center">No</th>
                            <th className="p-4 bg-gray-900 text-white font-semibold border-b border-gray-800 min-w-[150px]">Service Type*</th>
                            <th className="p-4 bg-gray-900 text-white font-semibold border-b border-gray-800 min-w-[150px]">Technician*</th>
                            <th className="p-4 bg-gray-900 text-white font-semibold border-b border-gray-800 min-w-[200px]">PIC/Partner*</th>
                            <th className="p-4 bg-gray-900 text-white font-semibold border-b border-gray-800 min-w-[250px]">Customer Details*</th>
                            <th className="p-4 bg-gray-900 text-white font-semibold border-b border-gray-800 min-w-[250px]">Product Info*</th>
                            <th className="p-4 bg-gray-900 text-white font-semibold border-b border-gray-800 min-w-[180px]">Service Date*</th>
                            <th className="p-4 bg-gray-900 text-white font-semibold border-b border-gray-800 min-w-[280px]">Service Location*</th>
                            <th className="p-4 bg-gray-900 text-white font-semibold border-b border-gray-800 min-w-[200px]">Complaints*</th>
                            <th className="p-4 bg-gray-900 text-white font-semibold border-b border-gray-800 sticky right-0 text-center shadow-[-4px_0_10px_rgba(0,0,0,0.3)]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {formList.map((form, index) => (
                            <tr key={index} className="group hover:bg-blue-50/30 align-top">
                                <td className="p-4 text-center text-gray-400 font-mono text-xs border-r border-gray-50">{index + 1}</td>

                                <td className="p-3 border-r border-gray-50">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                                        <select
                                            className="border border-gray-200 p-2 h-9 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                                            value={form.service_type}
                                            onChange={(e) => handleInputChange(index, 'service_type', e.target.value)}
                                        >
                                            <option value="">-</option>
                                            <option value="ONSITE">ONSITE</option>
                                            <option value="WALKIN">WALK IN</option>
                                            <option value="ZSC">ZSC</option>
                                            <option value="PARTNER">PARTNER</option>
                                        </select>
                                    </div>
                                </td>

                                <td className="p-3 border-r border-gray-50">
                                    <div className="mb-3">
                                        <select
                                            value={form.technician_name || ''}
                                            onChange={(e) => handleInputChange(index, 'technician_name', e.target.value)}
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
                                </td>

                                {/* PIC/PARTNER COLUMN */}
                                <td className="p-3 border-r border-gray-50">
                                    <div className="flex flex-col gap-1.5">
                                        {/* Input Field */}
                                        <input
                                            type="text"
                                            placeholder="Input PIC/Partner..."
                                            className="w-full p-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-xs transition-all bg-gray-50/50 focus:bg-white"
                                            value={form.partner}
                                            onChange={(e) => handleInputChange(index, 'partner', e.target.value)}
                                        />

                                        {/* Label Agent */}
                                        <div className="flex flex-col gap-1.5 mt-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Agent:</span>

                                                {/* Badge Agent */}
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border transition-all ${form.agent
                                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                    : 'bg-gray-50 text-gray-400 border-gray-100 italic'
                                                    }`}>
                                                    {form.agent || 'Unassigned'}
                                                </span>

                                                {/* Assign Button - Hanya muncul jika agent belum diisi atau bukan user saat ini */}
                                                {form.agent !== user?.username && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleInputChange(index, 'agent', user?.username || '')}
                                                        className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline font-semibold cursor-pointer transition-colors"
                                                    >
                                                        Assign to me
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* CUSTOMER COLUMN */}
                                <td className="p-3 border-r border-gray-50">
                                    <div className="flex flex-col gap-2">
                                        <div className="relative">
                                            <input
                                                autoComplete="off"
                                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-xs transition-all"
                                                placeholder="Search or Enter Name *"
                                                value={activeDropdown?.index === index && activeDropdown?.type === 'customer' ? customerQuery : form.name}
                                                onChange={(e) => {
                                                    setCustomerQuery(e.target.value);
                                                    handleInputChange(index, 'name', e.target.value);
                                                    debouncedFetchCustomers(e.target.value);
                                                    debouncedFetchServiceCenters(e.target.value);
                                                    setActiveDropdown({ type: 'customer', index });
                                                }}
                                                onFocus={() => setActiveDropdown({ type: 'customer', index })}
                                            />
                                            {activeDropdown?.index === index && activeDropdown?.type === 'customer' && customers && customers.length > 0 && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                                    <div className="absolute top-full left-0 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-xl z-50 mt-1">
                                                        {customers.map((s, i) => (
                                                            <div key={i} onMouseDown={() => handleSelectCustomer(index, s, 'customer')} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none">
                                                                <p className="text-xs font-bold text-gray-800">{s.name}</p>
                                                                <p className="text-[10px] text-gray-500">{s.email} • {s.city}</p>
                                                            </div>
                                                        ))}
                                                        {serviceCenters.map((s, i) => (
                                                            <div key={i} onMouseDown={() => handleSelectCustomer(index, s, 'serviceCenter')} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none">
                                                                <p className="text-xs font-bold text-gray-800">{s.name}</p>
                                                                <p className="text-[10px] text-gray-500">{s.phone}• {s.city}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <input className="w-full p-1.5 border-b border-transparent focus:border-blue-300 outline-none text-[11px] text-gray-600 bg-transparent" placeholder="Email" value={form.email} onChange={(e) => handleInputChange(index, 'email', e.target.value)} />
                                        <input className="w-full p-1.5 border-b border-transparent focus:border-blue-300 outline-none text-[11px] text-gray-600 bg-transparent" placeholder="Phone" value={form.phone_number} onChange={(e) => handleInputChange(index, 'phone_number', e.target.value)} />
                                        <input className="w-full p-1.5 border-b border-transparent focus:border-blue-300 outline-none text-[11px] text-gray-600 bg-transparent" placeholder="City" value={form.city} onChange={(e) => handleInputChange(index, 'city', e.target.value)} />
                                        <textarea className="w-full h-20 p-1.5 border-b border-transparent focus:border-blue-300 outline-none text-[11px] text-gray-600 bg-transparent" placeholder="Address *" rows={1} value={form.address} onChange={(e) => handleInputChange(index, 'address', e.target.value)} />
                                    </div>
                                </td>

                                {/* PRODUCT COLUMN */}
                                <td className="p-3 border-r border-gray-50">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">Serial Number</span>
                                            <input className="w-full p-2 border border-gray-200 rounded-md focus:border-blue-500 outline-none font-mono text-blue-600 uppercase text-xs" value={form.product_sn} onChange={(e) => handleInputChange(index, 'product_sn', e.target.value)} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">Product Type</span>
                                            <div className="relative">
                                                <input
                                                    autoComplete="off"
                                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-xs transition-all"
                                                    placeholder="Search or Enter Product Type"
                                                    value={activeDropdown?.index === index && activeDropdown?.type === 'productType' ? productTypeQuery : form.product_type}
                                                    onChange={(e) => {
                                                        setProductTypeQuery(e.target.value);
                                                        handleInputChange(index, 'product_type', e.target.value);
                                                        debouncedFetchProductTypes(e.target.value);
                                                        setActiveDropdown({ type: 'productType', index });
                                                    }}
                                                    onFocus={() => setActiveDropdown({ type: 'productType', index })}
                                                />
                                                {activeDropdown?.index === index && activeDropdown?.type === 'productType' && productTypes && productTypes.length > 0 && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                                        <div className="absolute top-full left-0 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-xl z-50 mt-1">
                                                            {productTypes?.map((s, i) => (
                                                                <div key={i} onMouseDown={() => handleSelectProductType(index, s)} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none">
                                                                    <p className="text-xs text-gray-800">{s.text}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* DATE COLUMN */}
                                <td className="p-3 border-r border-gray-50">
                                    <input type="date" className="w-full p-2 border border-gray-200 rounded-md focus:border-blue-500 outline-none text-xs" value={form.service_date} onChange={(e) => handleInputChange(index, 'service_date', e.target.value)} />
                                </td>

                                {/* LOCATION COLUMN */}
                                <td className="p-3 border-r border-gray-50">
                                    <div className="relative">
                                        <div className="relative flex items-center">
                                            <input
                                                autoComplete="off"
                                                placeholder="Search Service Center..."
                                                className={`w-full p-2 border rounded-md outline-none text-xs transition-all ${form.branch_id ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}
                                                value={searchQueries[index]}
                                                onChange={(e) => {
                                                    handleLocationSearchChange(index, e.target.value)
                                                }}
                                                onFocus={() => searchQueries[index].length > 2 && setActiveDropdown({ type: 'center', index })}
                                            />
                                            <RiSearchLine className="absolute right-2 text-gray-400" />
                                        </div>

                                        {activeDropdown?.index === index && activeDropdown?.type === 'center' && serviceCenters.length > 0 && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                                <div className="absolute top-full left-0 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-xl z-50 mt-1">
                                                    {serviceCenters.map((sc, i) => (
                                                        <div key={i} onMouseDown={() => handleSelectCenter(index, sc)} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none">
                                                            <p className="font-bold text-xs text-gray-800">{sc.name}</p>
                                                            <p className="text-[10px] text-gray-500 truncate">{sc.address}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        <div className="mt-2 flex flex-col w-fit gap-2">
                                            <span className="text-[12px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">BRANCH: {form.branch_id || '-'}</span>
                                            <span className="text-[12px] px-2 py-0.5 bg-gray-100 text-green-700 font-semibold rounded font-mono">TICKET: {form.ticket_id || '-'}</span>
                                        </div>
                                        {/* {form.branch_id && <span className="text-[10px] text-green-600 font-bold uppercase">Linked</span>} */}
                                    </div>
                                </td>


                                {/* COMPLAINTS */}
                                <td className="p-3 border-r border-gray-50">
                                    <textarea className="w-full p-2 border border-gray-200 rounded-md focus:border-blue-500 outline-none text-xs text-gray-600 italic resize-none" rows={2} placeholder="Details..." value={form.complaints} onChange={(e) => handleInputChange(index, 'complaints', e.target.value)} />
                                </td>

                                {/* ACTIONS */}
                                <td className="p-3 sticky right-0 bg-white group-hover:bg-blue-50 transition-colors shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">
                                    <div className="flex justify-center gap-1">
                                        <button onClick={() => copyRow(index)} title="Duplicate" className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                                            <RiFileCopyLine size={18} />
                                        </button>
                                        <button onClick={() => removeRow(index)} title="Delete" className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors">
                                            <RiDeleteBin6Line size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}