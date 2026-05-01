import { drivers } from "./data";
import { FaDownload, FaFileAlt } from "react-icons/fa"; // Pastikan install react-icons

export default function Driver() {
    return (
        <section className="px-[6%] md:px-[14%] my-32 w-full">
            <div className="flex items-center justify-between mb-8 border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Software & Drivers</h1>
                    <p className="text-gray-500 text-sm mt-1">Select the driver you need for your Zyrex device.</p>
                </div>
                <span className="text-xs font-medium bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                    {drivers.length} Files Available
                </span>
            </div>

            <ul className="grid grid-cols-1 gap-3">
                {drivers.map((d, i) => (
                    <li key={i} className="group">
                        <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl transition-all duration-200 hover:border-(--z-red) hover:shadow-md active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-red-50 transition-colors">
                                    <FaFileAlt className="text-gray-400 group-hover:text-(--z-red)" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700 group-hover:text-(--z-red) transition-colors tracking-tight">
                                        {d.label}
                                    </p>
                                    <p className="text-xs text-gray-400 uppercase font-semibold">Driver Installer</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-gray-400 group-hover:text-(--z-red) font-medium text-sm">
                                <span className="hidden md:inline">Download</span>
                                <FaDownload className="text-xs md:text-base" />
                            </div>
                        </a>
                    </li>
                ))}
            </ul>

            <p className="mt-8 text-center text-sm text-gray-400 italic">
                Don't see your driver? Please contact our technical support.
            </p>
        </section>
    );
}