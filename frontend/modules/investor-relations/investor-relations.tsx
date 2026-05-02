"use client"

import { useNavStyle } from "@/contexts/navbar-context"
import { contentMap, managementTeam, menu } from "./data"
import { useEffect, useState, useCallback } from "react"
import { getInvestorRelationData, InvestorRelationData } from "@/services/investor"

export default function InvestorRelations() {
    const { setVariant } = useNavStyle()
    const [active, setActive] = useState<string>(menu[0].state)
    const [activeYear, setActiveYear] = useState<string>("");
    const [reports, setReports] = useState<InvestorRelationData[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchReports = useCallback(async (type: string) => {
        setLoading(true);
        try {
            // Memanggil API dengan filter type
            const res = await getInvestorRelationData(type);
            const data = res.data.data || [];
            setReports(data);

            if (data.length > 0) {
                const uniqueYears = Array.from(new Set(data.map(item => item.year)))
                    .sort((a, b) => b.localeCompare(a));
                setActiveYear(uniqueYears[0]);
            } else {
                setActiveYear("");
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error);
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setVariant('b');
    }, [setVariant]);

    useEffect(() => {
        // Map active menu state ke backend-go type
        const typeMap: Record<string, string> = {
            'laporan-keuangan': 'financial-statement',
            'laporan-tahunan': 'annual-report',
            'rups': 'rups',
            'prospektus': 'prospectus'
        };

        if (typeMap[active]) {
            fetchReports(typeMap[active]);
        }
    }, [active, fetchReports]);

    const years = Array.from(new Set(reports.map(item => item.year))).sort((a, b) => b.localeCompare(a));
    const activeData = reports.filter(item => item.year === activeYear);
    const quarterList = ['Q1', 'Q2', 'Q3', 'Q4'];

    const content: any = contentMap[active];

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
            <section className="relative w-full h-[20vh] md:h-[50vh]">
                <img
                    src="/investor-bg.webp"
                    alt="News Zyrex"
                    className="absolute -z-10 w-full h-full object-cover"
                />
                <div className="px-[6%] md:px-[14%] w-full h-full flex items-center">
                    <h1 className="text-white font-bold text-2xl md:text-4xl md:w-4/5">
                        Investor Relations
                    </h1>
                </div>
            </section>

            <section className="px-[6%] py-10 md:py-14 md:px-[14%] w-full flex flex-col md:flex-row gap-10 md:gap-24 justify-between">
                <div className="flex md:flex-col flex-row overflow-x-auto md:overflow-visible w-full md:w-64 border-b md:border-b-0 shrink-0 thin-scrollbar">
                    {menu.map((m, i) => (
                        <div
                            key={i}
                            onClick={() => setActive(m.state)}
                            className={`whitespace-nowrap p-4 font-semibold cursor-pointer transition text-sm md:text-base
                    ${active === m.state
                                    ? "text-(--z-red) border-b-2 md:border-b-0 md:border-r-2 border-(--z-red) bg-red-50/30 md:bg-transparent"
                                    : "text-gray-500 border-b-2 md:border-b-0 border-transparent hover:text-(--z-red)"
                                }`}
                        >
                            {m.label}
                        </div>
                    ))}
                </div>

                {/* Konten Utama */}
                <div className="flex flex-col w-full gap-8">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">{content.title}</h2>
                    </div>

                    {loading ? (
                        <div className="py-10 text-center text-gray-400">Loading data...</div>
                    ) : years.length === 0 ? (
                        <div className="py-4 text-gray-400 italic">No data available at the moment.</div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Sidebar Tahun (Samping Kiri) */}
                            <div className="flex md:flex-col flex-row overflow-x-auto md:w-32 shrink-0 border-b md:border-b-0 md:border-r border-gray-200">
                                {years.map((y, i) => (
                                    <div
                                        key={i}
                                        className={`py-3 px-4 text-sm md:text-base cursor-pointer transition-all border-b-2 md:border-b-0 md:border-l-2 ${y === activeYear
                                            ? 'border-(--z-red) text-(--z-red) font-bold bg-red-50/50'
                                            : 'border-transparent text-gray-500 hover:bg-gray-50'
                                            }`}
                                        onClick={() => setActiveYear(y)}
                                    >
                                        {y}
                                    </div>
                                ))}
                            </div>

                            {/* List File (Samping Kanan) */}
                            <div className="flex-1 flex flex-col gap-3">
                                {active === 'laporan-keuangan' && quarterList.map((q) => {
                                    const report = activeData.find(item => item.quartal?.toUpperCase() === q);
                                    return (
                                        <div key={q} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                            <span className="font-medium text-gray-700">{q} Financial Report</span>
                                            {report?.url ? (
                                                <a href={report.url} target="_blank" rel="noopener noreferrer" className="text-(--z-red) font-semibold hover:underline flex items-center gap-1">
                                                    Download
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 text-sm italic">Not Available</span>
                                            )}
                                        </div>
                                    );
                                })}

                                {active === 'laporan-tahunan' && activeData.map((report, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <span className="font-medium text-gray-700">Annual Report {report.year}</span>
                                        <a href={report.url} target="_blank" rel="noopener noreferrer" className="text-(--z-red) font-semibold hover:underline">
                                            Download
                                        </a>
                                    </div>
                                ))}

                                {active === 'rups' && activeData.map((report, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <span className="font-medium text-gray-700">{formatFirebaseFileName(report.url)}</span>
                                        <a href={report.url} target="_blank" rel="noopener noreferrer" className="text-(--z-red) font-semibold hover:underline">
                                            Download
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Management Team Section Tetap Sama */}
            <section className="px-[6%] md:px-[14%] w-full py-12 flex flex-col gap-8 bg-gray-50">
                <h1 className="text-2xl font-semibold text-center mb-12">Management Team</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <p className="text-lg font-semibold mb-4 text-gray-700">Dewan Direksi</p>
                        <div className="flex gap-2 w-full flex-wrap">
                            {managementTeam.directors.map((d, idx) => (
                                <div key={idx} className="flex flex-col min-w-44 gap-2 p-4 bg-white border border-gray-200 rounded-md shadow-sm">
                                    <p className="font-bold text-(--z-red)">{d.name}</p>
                                    <i className="text-sm text-gray-600">{d.title}</i>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-lg font-semibold mb-4 text-gray-700">Dewan Komisaris</p>
                        <div className="flex gap-2 w-full flex-wrap">
                            {managementTeam.commissioners.map((d, idx) => (
                                <div key={idx} className="flex flex-col min-w-44 gap-2 p-4 bg-white border border-gray-200 rounded-md shadow-sm">
                                    <p className="font-bold text-(--z-red)">{d.name}</p>
                                    <i className="text-sm text-gray-600">{d.title}</i>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}