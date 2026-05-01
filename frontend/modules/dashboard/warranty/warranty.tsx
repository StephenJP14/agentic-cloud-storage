'use client'

import { useState, useRef, useEffect } from "react";
import { getAllWarranties, importWarranty, Warranty, WarrantyParams } from "@/services/warranty";
import { FaCloudUploadAlt, FaFileCsv, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from "react-icons/fa";
import { RiSearchLine } from "react-icons/ri";
import PaginationControls from "@/components/shared/pagination-controls";
import { formatDate } from "@/utils/string";

export default function WarrantyDashboard() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeMenu, setActiveMenu] = useState<'data' | 'upload'>('data');
    const [warranties, setWarranties] = useState<Warranty[] | null>(null)
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        inserted: number;
        skipped: number;
        errors: string[];
    } | null>(null);
    const [searchParams, setSearchParams] = useState<WarrantyParams>({
        page: 1,
        limit: 50,
        q: '',
    })

    const fetchWarranties = async () => {
        const res = await getAllWarranties(searchParams)
        setWarranties(res.data.data)
    }

    useEffect(() => {
        fetchWarranties()
    }, [])

    useEffect(() => {
        fetchWarranties()
    }, [searchParams])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            fetchWarranties()
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];

        if (selectedFile) {
            // VALIDASI: Cek apakah file extension adalah .csv
            const isCSV = selectedFile.name.toLowerCase().endsWith('.csv');
            // Beberapa browser membaca type sebagai 'text/csv'
            const isCSVType = selectedFile.type === 'text/csv' || selectedFile.type === 'application/vnd.ms-excel';

            if (!isCSV && !isCSVType) {
                alert("Hanya file CSV yang diperbolehkan!");
                if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
                return;
            }

            setFile(selectedFile);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const res = await importWarranty(file);
            setResult(res.data.data);
            setFile(null); // Clear file setelah sukses
        } catch (error) {
            console.error("Upload failed", error);
            alert("Terjadi kesalahan saat mengunggah file.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex">
                <button
                    onClick={() => setActiveMenu('data')}
                    className={`py-2 px-8 border-b-2 transition-colors ${activeMenu == 'data' ? 'border-(--z-red) text-white bg-(--z-red) rounded-t-md font-medium' : 'border-gray-300 text-gray-500'}`}
                >
                    Data
                </button>
                <button
                    onClick={() => setActiveMenu('upload')}
                    className={`py-2 px-8 border-b-2 transition-colors ${activeMenu == 'upload' ? 'border-(--z-red) text-white bg-(--z-red) rounded-t-md font-medium' : 'border-gray-300 text-gray-500'}`}
                >
                    Upload Data
                </button>
            </div>
            <section className="w-full h-[82vh] bg-white border border-gray-200 rounded-b-md shadow-sm p-4">
                {activeMenu === 'data' && (
                    <div className="w-full h-full flex flex-col gap-4">
                        <div className="flex justify-between items-center gap-2 shrink-0">
                            <span></span>
                            <div className="flex gap-2 items-center">
                                <div className="relative w-full md:w-64">
                                    <button
                                        onClick={fetchWarranties}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-(--z-red) flex justify-center items-center text-white rounded-md cursor-pointer z-20"
                                    >
                                        <RiSearchLine size={18} />
                                    </button>
                                    <input
                                        type="text"
                                        placeholder="Search any keywords..."
                                        value={searchParams.q}
                                        onChange={(e) => setSearchParams((prev) => ({ ...prev, q: e.target.value }))}
                                        onKeyDown={handleKeyDown}
                                        className="w-full pl-3 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm"
                                    />
                                </div>
                                <PaginationControls searchParams={searchParams} setSearchParams={setSearchParams} />
                            </div>
                        </div>
                        <div className="flex-1 border border-gray-100 rounded-md overflow-hidden flex flex-col">
                            <div className="w-full overflow-x-auto overflow-y-auto">
                                <table className="w-full border-collapse text-sm">
                                    <thead className="bg-gray-800 text-white sticky top-0 z-10">
                                        <tr className="whitespace-nowrap">
                                            <th className="p-3 text-left">No.</th>
                                            <th className="p-3 text-left">SN</th>
                                            <th className="p-3 text-left">Type</th>
                                            <th className="p-3 text-left">Model</th>
                                            <th className="p-3 text-left">Activation Date</th>
                                            <th className="p-3 text-left">Expiry Date</th>
                                            <th className="p-3 text-left">DO Date</th>
                                            <th className="p-3 text-left">Warranty</th>
                                            <th className="p-3 text-left">Status</th>
                                            <th className="p-3 text-left">Name</th>
                                            <th className="p-3 text-left">Email</th>
                                            <th className="p-3 text-left">Phone Number</th>
                                            <th className="p-3 text-left">Province</th>
                                            <th className="p-3 text-left">City</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-700">
                                        {loading ? (
                                            <tr><td colSpan={14} className="p-10 text-center">Loading data...</td></tr>
                                        ) : warranties?.length === 0 ? (
                                            <tr><td colSpan={14} className="p-10 text-center text-gray-400">No data found.</td></tr>
                                        ) : (
                                            warranties?.map((w, i) => (
                                                <tr
                                                    key={i}
                                                    className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer whitespace-nowrap"
                                                >
                                                    <td className="p-3 text-gray-400">{(searchParams.page - 1) * searchParams.limit + (i + 1)}</td>
                                                    <td className="p-3 text-gray-600">{w.product_sn || '-'}</td>
                                                    <td className="p-3 text-gray-600">{w.product_type || '-'}</td>
                                                    <td className="p-3 text-gray-600">{w.product_model || '-'}</td>
                                                    <td className="p-3 text-gray-600">{formatDate(w.activation_date) || '-'}</td>
                                                    <td className="p-3 text-gray-600">{formatDate(w.expiry_date) || '-'}</td>
                                                    <td className="p-3 text-gray-600">{w.do_date || '-'}</td>
                                                    <td className="p-3 text-gray-600">{(w.warranty_length / 365).toFixed(1)} Year(s)</td>
                                                    <td className={`p-3 ${w.warranty_status == 'active' ? 'text-green-600' : ''}`}>{w.warranty_status || '-'}</td>
                                                    <td className="p-3 text-gray-600">{w.name || '-'}</td>
                                                    <td className="p-3 text-gray-600">{w.email || '-'}</td>
                                                    <td className="p-3 text-gray-600">{w.phone_number || '-'}</td>
                                                    <td className="p-3 text-gray-600">{w.province || '-'}</td>
                                                    <td className="p-3 text-gray-600">{w.city || '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                {activeMenu === 'upload' && (
                    <div className="p-8">
                        <div className="text-center mb-8">
                            <h2 className="text-lg font-medium text-gray-700">Import Warranties via CSV</h2>
                            <p className="text-sm text-gray-500">Upload file CSV berisi data garansi produk Anda.</p>
                        </div>

                        {/* Dropzone Area */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors
                                ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-(--z-red) hover:bg-gray-50'}`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".csv"
                                className="hidden"
                            />

                            {file ? (
                                <>
                                    <FaFileCsv className="text-5xl text-green-500 mb-4" />
                                    <p className="font-medium text-gray-700">{file.name}</p>
                                    <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                                </>
                            ) : (
                                <>
                                    <FaCloudUploadAlt className="text-5xl text-gray-300 mb-4" />
                                    <p className="text-gray-600">Klik atau drag file CSV ke sini</p>
                                    <p className="text-xs text-gray-400 mt-2">Pastikan format kolom sesuai template</p>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={!file || loading}
                            className={`w-full mt-6 py-3 rounded-lg font-semibold transition-all flex justify-center items-center gap-2
                                ${!file || loading
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-black text-white hover:bg-gray-800 active:scale-[0.98]'}`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2 animate-pulse">
                                    Processing...
                                </span>
                            ) : "Upload & Import Data"}
                        </button>

                        {/* Result Dashboard */}
                        {result && (
                            <div className="mt-10 grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-center">
                                    <FaCheckCircle className="mx-auto text-blue-500 mb-2" />
                                    <p className="text-xs text-blue-600 uppercase font-bold">Inserted</p>
                                    <p className="text-2xl font-bold text-blue-700">{result.inserted}</p>
                                </div>
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-center">
                                    <FaExclamationTriangle className="mx-auto text-amber-500 mb-2" />
                                    <p className="text-xs text-amber-600 uppercase font-bold">Skipped</p>
                                    <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                                </div>
                                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-center">
                                    <FaTimesCircle className="mx-auto text-red-500 mb-2" />
                                    <p className="text-xs text-red-600 uppercase font-bold">Errors</p>
                                    <p className="text-2xl font-bold text-red-700">{result.errors?.length || 0}</p>
                                </div>

                                {result.errors && result.errors.length > 0 && (
                                    <div className="col-span-3 mt-2">
                                        <p className="text-sm font-semibold text-gray-700 mb-2">Error Details:</p>
                                        <div className="max-h-32 overflow-y-auto bg-gray-50 p-3 rounded border border-gray-200 text-xs text-red-600 font-mono">
                                            {result.errors.map((err, i) => (
                                                <div key={i} className="mb-1">• {err}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section >
        </>
    )
}