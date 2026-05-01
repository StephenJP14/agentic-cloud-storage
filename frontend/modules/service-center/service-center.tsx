"use client"

import { RiCustomerServiceFill, RiSearchLine } from "react-icons/ri";
import { MdCall } from "react-icons/md";
import { useEffect, useState } from "react";
import { IoOpenOutline } from "react-icons/io5";
import { getServiceCenters, ServiceCenter } from "@/services/serviceCenter";

export default function ServiceCenterPage() {
    const [query, setQuery] = useState('')
    const [allServiceCenters, setAllServiceCenters] = useState<ServiceCenter[]>([]); // Simpan semua data
    const [visibleCount, setVisibleCount] = useState(20); // Kontrol jumlah yang tampil
    const [isLoading, setIsLoading] = useState(true)

    const fetchServiceCenters = async () => {
        setIsLoading(true)
        try {
            const res = await getServiceCenters(query)
            setAllServiceCenters(res.data.data); // Simpan seluruh array
            setVisibleCount(20); // Reset jumlah tampilan saat search baru
        } catch (error) {
            console.error("Failed to fetch:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchServiceCenters()
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            fetchServiceCenters()
        }
    }

    // Ambil sebagian data berdasarkan visibleCount
    const displayedCenters = allServiceCenters.slice(0, visibleCount);

    const handleShowMore = () => {
        setVisibleCount((prev) => prev + 20); // Tambah 20 data lagi
    };

    return (
        <>
            <section className="relative w-full h-screen flex justify-center">
                <img
                    src="/service-center.svg"
                    alt="Service Center"
                    className="absolute -z-10 w-full h-full object-cover object-center"
                />
                <div className="mt-[16vh] text-center">
                    <h4 className="text-xl">SERVICE CENTER</h4>
                    <h1 className="font-bold text-4xl mt-4">Always Within Your Reach</h1>
                </div>
            </section>

            <section className="w-full relative flex flex-col justify-center">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 flex flex-col gap-6 w-80 md:w-120 p-6 bg-white border border-gray-300 rounded-xl shadow-2xl">
                    <h2 className="text-xl font-semibold text-center">Nearby Service Center</h2>

                    <div className="flex flex-col relative">
                        <label className="text-gray-400 text-sm mb-1 ml-1">Location:</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={"Search..."}
                                value={query}
                                onKeyDown={handleKeyDown}
                                onChange={(e) => setQuery(e.target.value)}
                                className="p-4 pl-4 border border-gray-300 w-full rounded-md outline-none focus:ring-2 focus:ring-(--z-red) transition-all"
                            />
                            <button onClick={fetchServiceCenters} className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-(--z-red) p-3 rounded-md cursor-pointer">
                                <RiSearchLine />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-center text-gray-400 text-sm font-medium">Need a service?</p>
                        <a href="/service" className="flex justify-center items-center gap-2 p-4 bg-(--z-red) hover:bg-(--z-red-dark) rounded-md text-white cursor-pointer transition-all active:scale-95 shadow-md">
                            <RiCustomerServiceFill size={20} />
                            <b>Book a Service</b>
                        </a>
                    </div>
                </div>
            </section>

            <section className="px-[6%] md:px-[14%] py-24 w-full mt-[20vh]">
                <div className="grid md:grid-cols-4 gap-6">
                    {displayedCenters.map((item, i) => (
                        <div
                            key={i}
                            className="flex flex-col justify-between gap-4 px-6 mb-4 min-h-60 border-l border-gray-300 transition-all"
                        >
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            <p className="text-sm">{item.address} | <span className="text-(--z-red)">{item.city}, {item.province}</span></p>
                            <div>
                                <p className="text-sm">🕒 {item.operational_hours}</p>
                                <p className="text-sm flex items-center gap-1"><MdCall size={20} />{item.phone}</p>
                            </div>
                            <a
                                href={
                                    item.map_url?.startsWith("https://")
                                        ? item.map_url
                                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex justify-center items-center gap-2 p-2 border border-gray-300 bg-gray-50 hover:bg-(--z-red) hover:text-white rounded-md cursor-pointer transition-colors"
                            >
                                Google Maps <IoOpenOutline size={18} />
                            </a>
                        </div>
                    ))}
                </div>

                <div className="mt-12 flex flex-col items-center gap-4">
                    {visibleCount < allServiceCenters.length && (
                        <button
                            onClick={handleShowMore}
                            className="px-8 py-3 border border-(--z-red) text-(--z-red) font-bold rounded-full hover:bg-(--z-red) hover:text-white transition-all active:scale-95"
                        >
                            Show More
                        </button>
                    )}
                </div>
                <p className="text-gray-500 text-sm text-center mt-8">
                    Showing {displayedCenters.length} of {allServiceCenters.length} Service Centers
                </p>
            </section>
        </>
    )
}