import { FaCheckCircle, FaWhatsapp } from "react-icons/fa";
import { MdOutlineEmail } from "react-icons/md";
import QRCode from "react-qr-code";

export default function Ticket({ ticketId, ticketRef }: { ticketId: string, ticketRef: any }) {
    return (
        <div ref={ticketRef} className="bg-white border border-gray-300 p-6 rounded-xl flex flex-col items-center text-center">
            <div className="w-full flex justify-between">
                <img src="/logo-red.svg" alt="Zyrex" className="w-24 mb-6 show-on-export" />
                <p className="text-xs text-gray-500 mb-6">Zyrex Customer Service</p>
            </div>

            <div className="flex gap-2 items-center">
                <h2 className="text-xl font-bold text-green-500">Booking Processed!</h2>
                <FaCheckCircle size={24} className="text-green-500" />
            </div>

            <div className="bg-white p-3 border border-gray-100 rounded-lg shadow-sm my-4">
                <QRCode
                    value={ticketId}
                    size={140}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                />
            </div>

            <div className="w-full bg-green-50/80 border-2 border-dashed border-green-200 rounded-lg p-4 mb-4">
                <span className="text-[10px] uppercase text-gray-600 font-black block mb-1 tracking-widest">Ticket ID</span>
                <code className="text-xl font-black text-green-800 tracking-widest">
                    {ticketId}
                </code>
            </div>

            <div className="text-[13px] text-red-800 text-left w-full space-y-1 bg-red-50/80 p-3 rounded">
                <p>• Show this Ticket to our Customer Service.</p>
                <p>• Save this ID to track your service status.</p>
            </div>

            <div className="hidden md:flex gap-4 mt-6 text-xs">
                <div className="flex gap-1 items-center">www.zyrex.com</div>
                <div className="flex gap-1 items-center"><MdOutlineEmail size={14} />cs@zyrex.com</div>
                <div className="flex gap-1 items-center"><FaWhatsapp size={14} />(+62) 811-9690-0531</div>
            </div>
        </div>
    )
}