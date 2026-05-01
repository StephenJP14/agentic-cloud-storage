'use client'

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { uploadToFirebase } from "@/services/firebase";
import toast from "react-hot-toast";
import { FaFileUpload, FaCloudUploadAlt } from "react-icons/fa";
import { getInvestorRelationData, InvestorRelationData, InvestorRelationType, uploadInvestorRelationData } from "@/services/investor";

export default function InvestorDashboard() {
    const { user } = useAuth()
    const [activeMenu, setActiveMenu] = useState<'data' | 'upload'>('data')
    const [loading, setLoading] = useState(false)
    const [file, setFile] = useState<File | null>(null);
    const [form, setForm] = useState({
        year: new Date().getFullYear().toString(),
        quartal: 'Q1',
        type: '' as InvestorRelationType
    })
    const [listData, setListData] = useState<InvestorRelationData[] | null>(null)

    const fetchInvestorRelationData = async () => {
        const res = await getInvestorRelationData()
        console.log(res.data.data)
        setListData(res.data.data)
    }

    useEffect(() => {
        fetchInvestorRelationData()
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== "application/pdf") {
                toast.error("Please upload a PDF file");
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return toast.error("Please select a file first");
        if (!form.type) return toast.error("Please select a report type");

        setLoading(true);
        try {
            const downloadUrl = await uploadToFirebase(file, 'investors');

            const payload = {
                ...form,
                quartal: form.type === 'financial-statement' ? form.quartal : "-",
                url: downloadUrl,
            };

            await uploadInvestorRelationData(payload)
            toast.success("Investor report uploaded successfully!");
            setFile(null);
            fetchInvestorRelationData(); // Refresh data setelah upload
            setActiveMenu('data');
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to upload file");
        } finally {
            setLoading(false);
        }
    };

    function formatFirebaseFileName(url: string): string {
        try {
            // Ambil bagian setelah /o/
            const pathEncoded = url.split('/o/')[1]?.split('?')[0];
            if (!pathEncoded) return '';

            // Decode URL encoding
            const path = decodeURIComponent(pathEncoded);

            // Ambil nama file
            const fileName = path.split('/').pop() || '';

            // Hapus extension
            const noExt = fileName.replace(/\.[^/.]+$/, '');

            // Hapus prefix angka + dash
            const noPrefix = noExt.replace(/^\d+-/, '');

            // Ganti dash jadi spasi
            const withSpaces = noPrefix.replace(/-/g, ' ');

            // Capitalize tiap kata
            const formatted = withSpaces
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            return formatted;
        } catch {
            return '';
        }
    }

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
                    Upload
                </button>
            </div>

            <section className="w-full h-[82vh] bg-white border border-gray-200 rounded-b-md shadow-sm p-6 overflow-y-auto">
                {activeMenu === 'data' && (
                    <div className="w-full h-full flex justify-between gap-4">
                        <div className="w-full rounded-md shadow-sm border border-gray-100">
                            <div className="w-full h-full overflow-y-auto rounded-md ">
                                <table className="w-full border-collapse text-sm">
                                    <thead className="bg-gray-800 text-white sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 text-left">No.</th>
                                            <th className="p-3 text-left">Name</th>
                                            <th className="p-3 text-left">Type</th>
                                            <th className="p-3 text-left">Year</th>
                                            <th className="p-3 text-left">Quartal</th>
                                            <th className="p-3 text-left">URL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-700">
                                        {loading ? (
                                            <tr><td colSpan={7} className="p-10 text-center">Loading data...</td></tr>
                                        ) : listData?.length === 0 ? (
                                            <tr><td colSpan={7} className="p-10 text-center text-gray-400 mt-12">No files found.</td></tr>
                                        ) : (
                                            listData?.map((s, i) => (
                                                <tr
                                                    key={s.ID}
                                                    className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer}`}
                                                >
                                                    <td className="p-3 text-gray-400">{i+1}</td>
                                                    <td className="p-3 text-gray-400">{formatFirebaseFileName(s.url)}</td>
                                                    <td className="p-3 text-gray-400">{s.type}</td>
                                                    <td className="p-3 text-gray-400">{s.year}</td>
                                                    <td className="p-3 text-gray-400">{s.quartal}</td>
                                                    <td className="p-3 text-gray-400 underline"><a href={s.url}>Preview</a></td>
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
                    <form onSubmit={handleUpload} className="max-w-2xl flex flex-col gap-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Type Field - Ditambahkan */}
                            <div className="flex flex-col gap-1 col-span-2">
                                <label className="text-sm font-medium text-gray-600">Report Type</label>
                                <select
                                    className="p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-(--z-red) bg-white"
                                    value={form.type}
                                    onChange={(e) => setForm({ ...form, type: e.target.value as InvestorRelationType })}
                                    required
                                >
                                    <option value="" disabled>Select Type</option>
                                    <option value="annual-report">Annual Report</option>
                                    <option value="rups">RUPS</option>
                                    <option value="prospectus">Prospectus</option>
                                    <option value="financial-statement">Financial Statement</option>
                                </select>
                            </div>

                            {/* Year Field */}
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-600">Year</label>
                                <input
                                    type="number"
                                    className="p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-(--z-red)"
                                    value={form.year}
                                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Quartal Field - Kondisional */}
                            {form.type === 'financial-statement' && (
                                <div className="flex flex-col gap-1 animate-in slide-in-from-left-2 duration-300">
                                    <label className="text-sm font-medium text-gray-600">Quartal</label>
                                    <select
                                        className="p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-(--z-red) bg-white"
                                        value={form.quartal}
                                        onChange={(e) => setForm({ ...form, quartal: e.target.value })}
                                    >
                                        <option value="Q1">Q1 (First Quarter)</option>
                                        <option value="Q2">Q2 (Second Quarter)</option>
                                        <option value="Q3">Q3 (Third Quarter)</option>
                                        <option value="Q4">Q4 (Fourth Quarter)</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* URL / File Upload Field */}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-600">Report File (PDF)</label>
                            <div className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-(--z-red)'}`}>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {file ? (
                                    <>
                                        <FaFileUpload className="text-4xl text-green-500 mb-2" />
                                        <p className="text-sm font-semibold text-green-700">{file.name}</p>
                                        <p className="text-xs text-green-500">Click to change file</p>
                                    </>
                                ) : (
                                    <>
                                        <FaCloudUploadAlt className="text-4xl text-gray-300 mb-2" />
                                        <p className="text-sm text-gray-500">Drag and drop or click to upload PDF</p>
                                        <p className="text-xs text-gray-400 mt-1">Maximum file size 10MB</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
                            <button
                                type="submit"
                                disabled={loading || !file}
                                className="flex items-center gap-2 px-10 py-3 bg-(--z-red) hover:bg-(--z-red) text-white rounded-md font-bold transition-all disabled:bg-gray-400"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                        Processing...
                                    </>
                                ) : "Submit Report"}
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </>
    )
}