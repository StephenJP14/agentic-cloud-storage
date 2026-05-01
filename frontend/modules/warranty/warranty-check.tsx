"use client"
import { CheckProductWarranty, CheckWarrantyResult } from "@/services/warranty";
import { useEffect, useState } from "react";
import { useNavStyle } from "@/contexts/navbar-context";
import { formatDate } from "@/utils/string";
import toast from "react-hot-toast";
import { IoInformationCircleOutline } from "react-icons/io5";
import { IoMdClose } from "react-icons/io";

export function WarrantyCheck() {
    const { setVariant } = useNavStyle()
    setVariant('b')

    const [warranty, setWarranty] = useState<CheckWarrantyResult | null>(null)
    const [productSN, setProductSN] = useState<string>("")
    const [statusColor, setStatusColor] = useState<string>("text-gray-500")
    const [showInfo, setShowInfo] = useState(false)

    useEffect(() => {
        setTimeout(() => {
            setShowInfo(true)
        }, 400);
        setTimeout(() => {
            setShowInfo(false)
        }, 3400);
    }, [])

    const handleCheckWarranty = async (productSN: string) => {
        try {
            const res = await CheckProductWarranty(productSN)
            console.log(res)
            const data = res.data.data
            setWarranty(data)
            handleWarrantyColor(data.status)
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || "Failed to check warranty"
            toast.error(errorMessage)
        }
    }

    const handleWarrantyColor = (warrantyStatus: string) => {
        switch (warrantyStatus.toLowerCase()) {
            case "inactive":
                setStatusColor("text-gray-500 bg-gray-100")
                return
            case "active":
                setStatusColor("text-green-600 bg-green-50")
                return
            case "expired":
                setStatusColor("text-red-600 bg-red-50")
                return
            default:
                setStatusColor("text-gray-500")
        }
    }

    return (
        <>
            <section className="h-[60vh] w-full flex flex-col">
                <div className="relative w-full h-full flex justify-center items-center">
                    <img src="/warranty-bg.webp" alt="Zyrex Warranty" className="absolute -z-10 w-full h-full object-cover" />
                    <h1 className="text-3xl md:text-4xl font-bold text-white text-center">Keep Your Product Protected</h1>
                </div>
                <div className="absolute bottom-24 md:bottom-40 left-1/2 -translate-x-1/2 flex flex-col gap-8 w-full md:w-120 p-6 bg-white md:shadow-2xl rounded-xl">
                    <h2 className="text-xl font-semibold text-center">Check Warranty</h2>
                    <div className="flex flex-col">
                        <label htmlFor="sn" className="text-gray-400">Product Serial Number:</label>
                        <input id="sn" className="p-4 border border-gray-300 w-full rounded-md" type="text"
                            placeholder="SN" value={productSN}
                            onChange={(e) => setProductSN(e.target.value)} />
                    </div>
                    <div className="relative">
                        <div onClick={() => setShowInfo(true)} className="flex gap-1 items-center justify-end hover:underline text-sm cursor-pointer">
                            Warranty Information
                            <IoInformationCircleOutline size={18} />
                        </div>
                        {showInfo && (
                            <div className="absolute bottom-10 right-0 w-72 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-2xl p-5 rounded-xl z-50 origin-bottom-right transition-all animate-in fade-in zoom-in slide-in-from-bottom-2 duration-600">                                <div className="mb-3 flex justify-between items-center border-b border-gray-100 pb-2">
                                <div className="flex items-center gap-2 text-(--z-red)">
                                    <IoInformationCircleOutline size={20} />
                                    <p className="font-bold text-sm uppercase tracking-tight">Policy</p>
                                </div>
                                <button
                                    onClick={() => setShowInfo(false)}
                                    className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                                >
                                    <IoMdClose size={18} />
                                </button>
                            </div>
                                <div className="space-y-2">
                                    <p className="text-xs leading-relaxed text-gray-600">
                                        Warranty for <span className="font-semibold text-gray-800">Battery</span> and <span className="font-semibold text-gray-800">Adapter</span> are <span className="text-(--z-red) font-bold">1/2</span> of the Product's warranty period for consumer products.
                                    </p>
                                    <div className="h-1 w-12 bg-gray-100 rounded-full" />
                                    <p className="text-[10px] text-gray-400 italic">
                                        *Terms and conditions apply.
                                    </p>
                                </div>

                                {/* Little triangle arrow (Tooltip tail) */}
                                <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <button
                            className="p-4 bg-(--z-red) hover:bg-(--z-red-dark) rounded-md text-white cursor-pointer"
                            onClick={() => handleCheckWarranty(productSN)}
                        >Check Warranty
                        </button>
                        <a href="/warranty-reg" className="text-center p-4 rounded-md bg-white border border-gray-300 cursor-pointer">
                            Activate Warranty
                        </a>
                    </div>
                </div>
            </section>

            <div className="w-full flex justify-center items-center mt-[32vh] mb-32">
                <div className="w-[90%] max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-800 p-4">
                        <h2 className="text-white font-semibold text-center uppercase tracking-wider">Warranty Details</h2>
                    </div>
                    {!warranty ? (
                        <div className="p-12 text-center text-gray-400">
                            <p>Please enter your Serial Number to see warranty information.</p>
                        </div>
                    ) : (
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-400 uppercase">Name</span>
                                <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold w-fit ${statusColor}`}>
                                    {warranty.name?.toUpperCase() || '-'}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-400 uppercase">Model</span>
                                <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold w-fit ${statusColor}`}>
                                    {warranty.product_model?.toUpperCase() || '-'}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-400 uppercase">Type</span>
                                <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold w-fit ${statusColor}`}>
                                    {warranty.product_type?.toUpperCase() || '-'}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-400 uppercase">Status</span>
                                <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold w-fit ${statusColor}`}>
                                    {warranty.status?.toUpperCase() || '-'}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-400 uppercase">Expiry Date</span>
                                <p className="text-lg font-semibold text-gray-800">{formatDate(warranty.expiry_date)}</p>
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2 border-t pt-6">
                                <span className="text-xs font-bold text-gray-400 uppercase">Remaining Warranty</span>
                                <div className="flex items-end gap-2">
                                    <p className="text-4xl font-black text-(--z-red)">{warranty.remaining_days > 0 ? warranty.remaining_days : 0}</p>
                                    <p className="text-gray-500 font-medium mb-1">Days left</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}