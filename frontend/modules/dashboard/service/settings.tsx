'use client';

import {
    DropdownRange,
    getDropdownRanges,
    addNewDropdownValue,
} from "@/services/cs";
import { debounce } from "@/utils/debounce";
import { useCallback, useEffect, useState } from "react";
import { RiSearchLine, RiAddLine, RiSettings4Line } from "react-icons/ri";

type DropdownTypes = 'solution' | 'parts' | 'product_type';

// 1. PINDAHKAN TableContainer ke luar agar tidak re-created di setiap render
const TableContainer = ({ title, count, children }: { title: string, count?: number, children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden transition-all hover:shadow-md">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
                <RiSettings4Line className="text-slate-400" />
                {title}
            </label>
            <span className="text-[10px] font-bold text-slate-400 bg-white border px-2 py-0.5 rounded-full shadow-sm">
                {count || 0} Items
            </span>
        </div>
        {children}
    </div>
);

export default function ServiceSettings() {
    const [solutions, setSolutions] = useState<DropdownRange[] | null>(null);
    const [solutionQuery, setSolutionQuery] = useState('');
    const [parts, setParts] = useState<DropdownRange[] | null>(null);
    const [partsQuery, setPartsQuery] = useState('');
    const [productTypes, setProductTypes] = useState<DropdownRange[] | null>(null);
    const [productTypeQuery, setProductTypeQuery] = useState('');

    const fetchDropdownRanges = async (type: DropdownTypes, q: string) => {
        const res = await getDropdownRanges(type, q);
        if (type === 'solution') setSolutions(res.data.data);
        if (type === 'parts') setParts(res.data.data);
        if (type === 'product_type') setProductTypes(res.data.data);
    };

    const debouncedFetchDropdownRanges = useCallback(
        debounce((type: DropdownTypes, q: string) => {
            fetchDropdownRanges(type, q)
        }, 500),
        []
    )

    const handleAddNew = async (type: DropdownTypes, hNh?: string) => {
        let query = type === 'solution' ? solutionQuery : type === 'parts' ? partsQuery : productTypeQuery;
        if (!query.trim()) return;

        try {
            await addNewDropdownValue({
                type,
                text: query,
                ...(type === 'solution' && { h_nh: hNh })
            });

            if (type === 'solution') setSolutionQuery('');
            else if (type === 'parts') setPartsQuery('');
            else setProductTypeQuery('');

            await fetchDropdownRanges(type, '');
        } catch (error) {
            console.error("Failed to add new item:", error);
        }
    };

    useEffect(() => {
        fetchDropdownRanges('solution', '');
        fetchDropdownRanges('parts', '');
        fetchDropdownRanges('product_type', '');
    }, []);

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-120px)]">

                {/* --- TABLE SOLUTION --- */}
                <TableContainer title="Solution" count={solutions?.length}>
                    <div className="p-4 shrink-0 space-y-3">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search or type new solution..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-100 focus:border-blue-100 outline-none text-sm transition-all"
                                value={solutionQuery}
                                onChange={(e) => {
                                    setSolutionQuery(e.target.value)
                                    if (e.target.value.length > 2) {
                                        debouncedFetchDropdownRanges('solution', e.target.value)
                                    }
                                }}
                            />
                            <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => fetchDropdownRanges('solution', solutionQuery)} className="col-span-1 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-[11px] font-bold uppercase tracking-wider">Search</button>
                            <button onClick={() => handleAddNew('solution', 'H')} className="col-span-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-black flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-transform active:scale-95"><RiAddLine /> Add H</button>
                            <button onClick={() => handleAddNew('solution', 'NH')} className="col-span-1 py-2 bg-white border-2 border-slate-900 text-slate-900 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-transform active:scale-95"><RiAddLine /> Add NH</button>
                        </div>
                    </div>
                    {/* ... (rest of the list code) */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        <div className="border border-gray-100 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <tbody className="divide-y divide-gray-50">
                                    {solutions?.map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-4 py-3 flex items-center justify-between">
                                                <span className="text-slate-600 font-medium">{item.text}</span>
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${item.h_nh === 'H' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>{item.h_nh}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TableContainer>

                {/* --- TABLE PARTS --- */}
                <TableContainer title="Parts" count={parts?.length}>
                    <div className="p-4 shrink-0 flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search/Add Part..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-100 outline-none text-sm"
                                value={partsQuery}
                                onChange={(e) => {
                                    setPartsQuery(e.target.value)
                                    if (e.target.value.length > 2) {
                                        debouncedFetchDropdownRanges('parts', e.target.value)
                                    }
                                }}
                            />
                            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        <button onClick={() => handleAddNew('parts')} className="p-2.5 bg-slate-900 text-white rounded-lg hover:bg-black"><RiAddLine /></button>
                    </div>
                    {/* ... (rest of the list code) */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        <div className="border border-gray-100 rounded-lg">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-gray-50">
                                    {parts?.map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-600">{item.text}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TableContainer>

                {/* --- TABLE PRODUCT TYPE --- */}
                <TableContainer title="Product Type" count={productTypes?.length}>
                    <div className="p-4 shrink-0 flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search/Add Type..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-100 outline-none text-sm"
                                value={productTypeQuery}
                                onChange={(e) => {
                                    setProductTypeQuery(e.target.value)
                                    if (e.target.value.length > 2) {
                                        debouncedFetchDropdownRanges('product_type', e.target.value)
                                    }
                                }}
                            />
                            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        <button onClick={() => handleAddNew('product_type')} className="p-2.5 bg-slate-900 text-white rounded-lg hover:bg-black"><RiAddLine /></button>
                    </div>
                    {/* ... (rest of the list code) */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        <div className="border border-gray-100 rounded-lg">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-gray-50">
                                    {productTypes?.map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-600">{item.text}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TableContainer>

            </div>
        </div>
    );
}