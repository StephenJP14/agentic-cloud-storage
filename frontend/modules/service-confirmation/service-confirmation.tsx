"use client"
import { BookingServiceDTO, getServiceById, updateServiceStatus } from "@/services/cs"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FiCalendar, FiSmartphone, FiCheckCircle, FiAlertCircle, FiThumbsUp, FiXCircle } from "react-icons/fi"
import toast from "react-hot-toast"

export default function ServiceConfirmation({ id }: { id: string }) {
    const [serviceData, setServiceData] = useState<BookingServiceDTO | null>(null)
    const [loading, setLoading] = useState(true)
    const [isJustConfirmed, setIsJustConfirmed] = useState(false)
    const [isJustCancelled, setIsJustCancelled] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const fetchServiceData = async () => {
            try {
                const res = await getServiceById(id)
                const data: BookingServiceDTO = res.data.data

                if (data.service_status.toLowerCase() === "confirmed" ||
                    data.service_status.toUpperCase() !== "PENDING" ||
                    data.service_type?.toUpperCase() !== "BOOKING") {

                    setServiceData(null)
                    setTimeout(() => router.push("/service"), 3000)
                } else {
                    setServiceData(data)
                }
            } catch (error) {
                console.error("Error fetching service:", error)
                setServiceData(null)
            } finally {
                setLoading(false)
            }
        }
        fetchServiceData()
    }, [id, router])

    const handleConfirm = async () => {
        if (!serviceData) return
        try {
            await updateServiceStatus({
                status: 'confirmed',
                ticket_id: serviceData.ticket_id
            })
            toast.success("Konfirmasi Berhasil!")
            setIsJustConfirmed(true)
        } catch (error) {
            toast.error("Gagal melakukan konfirmasi")
        }
    }

    const handleCancel = async () => {
        if (!serviceData) return
        try {
            await updateServiceStatus({
                status: 'closed',
                ticket_id: serviceData.ticket_id
            })
            toast.success("Pesanan dibatalkan")
            setIsJustCancelled(true)
        } catch (error) {
            toast.error("Gagal melakukan pembatalan")
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        )
    }

    // 1. TAMPILAN SUKSES KONFIRMASI
    if (isJustConfirmed && serviceData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiThumbsUp size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
                    <p className="text-gray-500 mb-6 text-sm">
                        Kehadiran Anda telah dikonfirmasi untuk tiket <span className="font-mono font-bold text-gray-700">#{serviceData.ticket_id}</span>.
                    </p>
                    <button
                        onClick={() => router.push("/service")}
                        className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all"
                    >
                        OK
                    </button>
                </div>
            </div>
        )
    }

    // 2. TAMPILAN SUKSES CANCEL
    if (isJustCancelled && serviceData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiXCircle size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Dibatalkan</h1>
                    <p className="text-gray-500 mb-6 text-sm">
                        Jadwal layanan untuk tiket <span className="font-mono font-bold text-gray-700">#{serviceData.ticket_id}</span> telah berhasil dibatalkan.
                    </p>
                    <button
                        onClick={() => router.push("/service")}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-all"
                    >
                        Kembali ke Layanan
                    </button>
                </div>
            </div>
        )
    }

    // 3. TAMPILAN EXPIRED / INVALID
    if (!serviceData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-sm w-full bg-white p-8 rounded-2xl shadow-sm text-center">
                    <FiAlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
                    <h1 className="text-lg font-bold text-gray-900 mb-2">Invalid Link!</h1>
                    <p className="text-sm text-gray-500 mb-6">
                        Sorry, this Booking Service is already confirmed, processed, or expired link.
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Returning you...</p>
                </div>
            </div>
        )
    }

    // 4. TAMPILAN FORM KONFIRMASI
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FiCheckCircle size={24} />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">Konfirmasi Kedatangan</h1>
                <p className="text-sm text-gray-500 mb-8 font-mono">#{serviceData.ticket_id}</p>

                <div className="space-y-4 mb-10 text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                        <FiSmartphone className="text-gray-400" />
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Unit</p>
                            <p className="text-xs font-bold text-gray-700">{serviceData.product_sn}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <FiCalendar className="text-gray-400" />
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Jadwal</p>
                            <p className="text-xs font-bold text-gray-700">
                                {new Date(serviceData.service_date).toLocaleDateString('id-ID', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        className="w-full bg-(--z-red) hover:scale-105 transition-all text-white font-bold py-3.5 rounded-xl active:scale-95 shadow-lg shadow-red-500/10 cursor-pointer"
                        onClick={handleConfirm}
                    >
                        Ya, Saya Hadir
                    </button>
                    <button
                        className="w-full text-gray-400 hover:text-gray-600 text-sm font-semibold py-2 cursor-pointer"
                        onClick={handleCancel}
                    >
                        Batalkan / Reschedule
                    </button>
                </div>
            </div>
        </div>
    )
}