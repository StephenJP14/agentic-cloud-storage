"use client"

import { useEffect, useState } from "react"
import { useNavStyle } from "@/contexts/navbar-context"
import { ActivateWarranty, ActivateWarrantyResult, type ActivateWarrantyDTO } from "@/services/warranty"
import { toast } from "react-hot-toast"
import { FaCheckCircle, FaCalendarAlt, FaClock } from "react-icons/fa"


export function WarrantyRegistration() {
    const { setVariant } = useNavStyle()
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<ActivateWarrantyResult | null>(null)

    const [formData, setFormData] = useState<ActivateWarrantyDTO>({
        name: "",
        email: "",
        phone_number: "",
        province: "",
        city: "",
        product_sn: ""
    })

    useEffect(() => {
        setVariant("b")
    }, [setVariant])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        setIsLoading(true)
        setResult(null) // Reset result sebelumnya

        try {
            const res = await ActivateWarranty(formData)
            const activationData = res.data.data as ActivateWarrantyResult
            setResult(activationData)

            toast.success("Warranty activated successfully!")
            setFormData({
                name: "", email: "", phone_number: "",
                province: "", city: "", product_sn: ""
            })
        } catch (error: any) {
            console.error(error)
            const errorMessage = error.response?.data?.message || "Failed to activate warranty"
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <section className="w-full relative">
            <div className="relative w-full h-[60vh] flex justify-center items-center">
                <img src="/warranty-bg.webp" alt="Zyrex Warranty" className="absolute -z-10 w-full h-full object-cover" />
                <h1 className="text-3xl md:text-4xl font-bold text-white text-center tracking-tight">Keep Your Product Protected</h1>
            </div>

            <div className="relative md:-mt-32 px-[6%] md:px-0 pb-16">
                <div className="mx-auto w-full md:w-200">

                    {/* Tampilkan Result Card jika Sukses */}
                    {result && (
                        <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl animate-in fade-in zoom-in duration-300">
                            <div className="flex items-center gap-3 text-green-700 mb-4">
                                <FaCheckCircle className="text-2xl" />
                                <h3 className="font-bold text-lg">Activation Successful!</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
                                    <p className="text-lg font-semibold text-green-600 capitalize">{result.status}</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <FaCalendarAlt className="text-xs" />
                                        <p className="text-xs uppercase font-bold">Expiry Date</p>
                                    </div>
                                    <p className="text-lg font-semibold text-gray-800">
                                        {new Date(result.expiry_date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <FaClock className="text-xs" />
                                        <p className="text-xs uppercase font-bold">Remaining</p>
                                    </div>
                                    <p className="text-lg font-semibold text-gray-800">{result.remaining_days} Days</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8 bg-white md:shadow-2xl rounded-xl border border-gray-100"
                    >
                        <h2 className="text-xl font-semibold text-center md:col-span-2 text-gray-800">
                            {result ? "Activate Another Product" : "Activate Warranty"}
                        </h2>

                        <div className="flex flex-col md:col-span-2">
                            <label className="text-gray-500 text-xs mb-1 ml-1 uppercase font-bold tracking-wider">Fullname</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-(--z-red) outline-none transition-all"
                                placeholder="Enter your full name"
                            />
                        </div>

                        {/* ... Input field Email, Phone, Province, City tetap sama ... */}
                        {/* (Sengaja saya ringkas untuk fokus ke integrasi data baru) */}
                        <div className="flex flex-col">
                            <label className="text-gray-500 text-xs mb-1 ml-1 uppercase font-bold tracking-wider">Email</label>
                            <input name="email" type="email" value={formData.email} onChange={handleChange} required className="p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-(--z-red) outline-none" placeholder="Email address" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-gray-500 text-xs mb-1 ml-1 uppercase font-bold tracking-wider">Phone</label>
                            <input name="phone_number" value={formData.phone_number} onChange={handleChange} required className="p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-(--z-red) outline-none" placeholder="Phone number" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-gray-500 text-xs mb-1 ml-1 uppercase font-bold tracking-wider">Province</label>
                            <input name="province" value={formData.province} onChange={handleChange} required className="p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-(--z-red) outline-none" placeholder="Province" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-gray-500 text-xs mb-1 ml-1 uppercase font-bold tracking-wider">City</label>
                            <input name="city" value={formData.city} onChange={handleChange} required className="p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-(--z-red) outline-none" placeholder="City" />
                        </div>

                        <div className="flex flex-col md:col-span-2">
                            <label className="text-gray-500 text-xs mb-1 ml-1 uppercase font-bold tracking-wider">Product Serial Number</label>
                            <input
                                name="product_sn"
                                value={formData.product_sn}
                                onChange={handleChange}
                                required
                                className="p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-(--z-red) outline-none transition-all font-mono text-lg tracking-widest"
                                placeholder="e.g. ZYX123456789"
                            />
                        </div>

                        <div className="flex flex-col gap-3 md:col-span-2 pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`p-4 bg-(--z-red) hover:bg-(--z-red-dark) rounded-md text-white font-semibold transition-all shadow-lg active:scale-[0.98] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? "Checking & Activating..." : "Activate Warranty Now"}
                            </button>
                            <a
                                href="/warranty-check"
                                className="text-center p-4 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors text-gray-600 font-medium"
                            >
                                Check Existing Warranty
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    )
}