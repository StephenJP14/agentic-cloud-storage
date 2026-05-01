'use client'

import { MdOutlineEmail, MdCall } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import { useNavStyle } from "@/contexts/navbar-context";
import { useState } from "react";

export default function Contact() {
    const { setVariant } = useNavStyle()
    setVariant('b')

    const [form, setForm] = useState({
        fullname: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({
            ...prev,
            [e.target.id]: e.target.value
        }))
    }

    const handleSubmit = () => {
        // ✅ Validasi simple
        if (!form.fullname || !form.phone || !form.message) {
            alert("Please fill name, phone, and message.")
            return
        }

        const text = `
Halo Zyrex,

Perkenalkan, saya ${form.fullname}.

Saya ingin menghubungi tim Zyrex terkait ${form.subject || "beberapa hal"}.

${form.message}

Berikut kontak saya:
Email: ${form.email || "-"}
WhatsApp: ${form.phone}

Terima kasih.
`.trim()


        const encoded = encodeURIComponent(text)

        const phoneNumber = "6281196900531"

        const waUrl = `https://wa.me/${phoneNumber}?text=${encoded}`

        window.open(waUrl, "_blank")
    }

    return (
        <>
            <section className="relative w-full h-[40vh] md:h-[50vh]">
                <img
                    src="/contact.webp"
                    alt="Contact Zyrex"
                    className="w-full h-full object-cover"
                />
            </section>

            <section className="px-[6%] md:px-[14%] py-6 md:py-12 relative w-full flex flex-col md:flex-row gap-12 md:gap-0 justify-between">
                <div className="flex flex-col gap-4">
                    <h1 className="font-bold text-xl md:text-3xl md:w-4/5">Thank You for Trusting Zyrex</h1>
                    <p className="md:w-2/3 md:text-xl">Reach out to our team for support, product information, or any questions about Zyrex.</p>
                    <div className="hidden md:flex gap-4 mt-12">
                        <div className="flex gap-2 items-center"><MdOutlineEmail size={24} />cs@zyrex.com</div>
                        <div className="flex gap-2 items-center"><FaWhatsapp size={24} />(+62) 811-9690-0531</div>
                        <div className="flex gap-2 items-center"><MdCall size={24} />(+62) 215653311</div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 md:w-1/3 bg-white rounded-md">
                    <h2 className="text-lg md:text-xl font-semibold mb-2">Contact Us</h2>

                    <div className="flex flex-col">
                        <label htmlFor="fullname" className="text-sm text-gray-400">Full Name:</label>
                        <input id="fullname" value={form.fullname} onChange={handleChange}
                            className="p-4 border border-gray-300 w-full rounded-md" type="text" placeholder="Fullname" />
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="email" className="text-sm text-gray-400">Email:</label>
                        <input id="email" value={form.email} onChange={handleChange}
                            className="p-4 border border-gray-300 w-full rounded-md" type="text" placeholder="Email" />
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="phone" className="text-sm text-gray-400">Phone:</label>
                        <input id="phone" value={form.phone} onChange={handleChange}
                            className="p-4 border border-gray-300 w-full rounded-md" type="text" placeholder="Phone number" />
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="subject" className="text-sm text-gray-400">Subject:</label>
                        <input id="subject" value={form.subject} onChange={handleChange}
                            className="p-4 border border-gray-300 w-full rounded-md" type="text" placeholder="Subject" />
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="message" className="text-sm text-gray-400">
                            Message:
                        </label>
                        <textarea
                            id="message"
                            value={form.message}
                            onChange={handleChange}
                            className="p-4 border border-gray-300 w-full rounded-md resize-none min-h-30"
                            placeholder="Message..."
                        />
                    </div>

                    <div className="flex flex-col gap-2 mt-6">
                        <button
                            onClick={handleSubmit}
                            className="px-2 py-3 bg-(--z-red) hover:bg-(--z-red-dark) rounded-md text-white cursor-pointer"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            </section>
        </>
    )
}
