"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
    RiQrScan2Line,
    RiStopCircleLine,
    RiCameraLine,
    RiImageAddLine,
    RiLoader4Line,
    RiKeyboardLine,
    RiTicket2Line,
    RiTimeLine,
    RiArrowRightLine
} from "react-icons/ri";
import { ServiceStatus, updateServiceStatus } from "@/services/cs";
import toast from "react-hot-toast";
import { STATUS_COLORS } from "@/utils/colors";
import { useAuth } from "@/contexts/auth-context";

export default function Scanner() {
    const { user } = useAuth();
    const isSystem = user?.department.toLowerCase() === 'system';

    const [isActive, setIsActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [printing, setPrinting] = useState(false)
    const [countdown, setCountdown] = useState<number>(0);
    const [initialCountdown, setInitialCountdown] = useState<number>(0);

    const qrScannerRef = useRef<Html5Qrcode | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const manualInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        manualInputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (countdown <= 0) {
            if (countdown === 0) setScanResult(null);
            return;
        }

        const timer = setInterval(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown]);

    const handleUpdateStatus = async (ticketId: string, newStatus: ServiceStatus) => {
        setIsProcessing(true);
        try {
            const res = await updateServiceStatus({ ticket_id: ticketId, status: newStatus });

            setScanResult(ticketId);
            toast.success('Status updated successfully!');

            if (res.data.data.status === 'completed' && isSystem) {
                setCountdown(4);
                setInitialCountdown(4);
                setPrinting(true)
                setTimeout(() => {
                    window.location.href = `/dashboard?section=service&tab=documents&ticketId=${res.data.data.ticket_id}&autoprint=yes`;
                }, 4000);
            } else {
                setInitialCountdown(10);
                setCountdown(10);
            }
        } catch (error) {
            toast.error('Failed to update status.');
        } finally {
            setIsProcessing(false);
            // setPrinting(false);
        }
    }

    const startScanner = async () => {
        try {
            const scanner = new Html5Qrcode("reader");
            qrScannerRef.current = scanner;
            setIsActive(true);

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 20,
                    aspectRatio: 1.0,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    handleUpdateStatus(decodedText, 'responded');
                    stopScanner();
                },
                () => { }
            );
        } catch (err) {
            console.error(err);
            toast.error("Gagal akses kamera.");
            setIsActive(false);
        }
    };

    const stopScanner = async () => {
        if (qrScannerRef.current) {
            try {
                await qrScannerRef.current.stop();
                qrScannerRef.current = null;
                setIsActive(false);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsProcessing(true);
        const html5QrCode = new Html5Qrcode("reader");
        try {
            const decodedText = await html5QrCode.scanFile(file, true);
            await handleUpdateStatus(decodedText, 'ongoing');
        } catch (err) {
            toast.error("QR Code tidak ditemukan pada gambar.");
        } finally {
            setIsProcessing(false);
            if (e.target) e.target.value = "";
        }
    };

    const handleManualSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const value = manualInputRef.current?.value;

        if (value && value.trim() !== "") {
            handleUpdateStatus(value, 'ongoing');
            if (manualInputRef.current) {
                manualInputRef.current.value = "";
                manualInputRef.current.focus();
            }
        } else {
            toast.error("Input tidak boleh kosong");
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto min-h-[80vh]">
            <div className="flex-2 flex flex-col">
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
                    <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <RiQrScan2Line className="text-(--z-red)" /> SCANNER INPUT
                        </h2>
                        {isActive && (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 animate-pulse">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> LIVE CAMERA
                            </span>
                        )}
                    </div>

                    <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden min-h-100">
                        <div id="reader" className="w-auto h-[50vh] aspect-square object-cover"></div>

                        {!isActive && !isProcessing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-gray-600 gap-3">
                                <RiCameraLine size={48} className="opacity-20" />
                                <p className="text-xs font-bold tracking-widest uppercase opacity-40">Camera Ready</p>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="absolute inset-0 bg-slate-900/90 z-10 flex flex-col items-center justify-center text-white">
                                <RiLoader4Line size={40} className="animate-spin text-(--z-red) mb-2" />
                                <p className="text-sm font-bold italic tracking-tighter">Processing...</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 grid grid-cols-2 gap-3 bg-white">
                        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />
                        <button
                            onClick={isActive ? stopScanner : startScanner}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all tracking-tight ${isActive ? "bg-gray-100 text-gray-600" : "bg-(--z-red) text-white shadow-lg shadow-red-500/20"
                                }`}
                        >
                            {isActive ? <RiStopCircleLine size={18} /> : <RiQrScan2Line size={18} />}
                            {isActive ? "MATIKAN KAMERA" : "AKTIFKAN KAMERA"}
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-50 transition-all tracking-tight"
                        >
                            <RiImageAddLine size={18} /> UPLOAD TIKET
                        </button>
                    </div>

                    <div className="relative z-10 p-4 border-t border-gray-100 bg-gray-50/50">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <RiKeyboardLine className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    ref={manualInputRef}
                                    type="text"
                                    placeholder="Input manual atau scan fisik..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleManualSubmit();
                                        }
                                    }}
                                    onChange={e => {
                                        if (e.target.value.length > 16) {
                                            handleManualSubmit();
                                        }
                                    }}
                                    className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-red-500/10 focus:border-(--z-red) bg-white transition-all font-medium"
                                    autoComplete="off"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => handleManualSubmit()}
                                className="px-6 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-black transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95 cursor-pointer shadow-sm"
                            >
                                Submit <RiArrowRightLine size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1">
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col sticky top-6">
                    <div className="p-4 border-b border-gray-50 bg-gray-50/50 text-center uppercase tracking-widest">
                        <h2 className="text-[10px] font-black text-gray-400">Scan Result</h2>
                    </div>

                    <div className="p-8 flex-1 flex flex-col items-center justify-center">
                        {scanResult ? (
                            <div className="flex flex-col items-center justify-center w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-green-50 text-green-600 p-4 rounded-3xl inline-block mb-6 ring-8 ring-green-50/50">
                                    <RiTicket2Line size={40} />
                                </div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Ticket ID Scanned</p>
                                <h3 className="text-2xl font-black text-slate-800 break-all leading-tight tracking-tighter mb-8 text-center">
                                    {scanResult}
                                </h3>
                                <div className="space-y-3 w-full">
                                    <button
                                        onClick={() => setScanResult(null)}
                                        className="w-full py-4 px-8 bg-red-50 text-red-800 rounded-xl font-black text-xs hover:bg-red-100 transition-all uppercase tracking-widest flex justify-center items-center gap-2"
                                    >
                                        Reset ({countdown})
                                    </button>
                                </div>
                                {printing && (
                                    <div className="mt-12 p-6 bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                                        {/* Animated Icon/Spinner */}
                                        <div className="relative mb-4">
                                            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-sm font-medium text-slate-500">Status:</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_COLORS.completed} shadow-sm`}>
                                                Completed
                                            </span>
                                        </div>

                                        {/* Text Info */}
                                        <h3 className="text-slate-800 font-semibold">Menyiapkan Dokumen</h3>
                                        <p className="text-sm text-slate-400 mt-1">Anda akan diarahkan ke Service Document...</p>

                                        {/* Progress Bar (Sync dengan countdown) */}
                                        <div className="w-full max-w-xs bg-slate-100 h-1.5 rounded-full mt-6 overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-full transition-all duration-1000 ease-linear"
                                                style={{ width: `${(countdown / initialCountdown) * 100}%` }}
                                            ></div>
                                        </div>

                                        <span className="text-[10px] font-mono text-slate-400 mt-2 uppercase tracking-tighter">
                                            Redirecting in {countdown}s
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="opacity-10 flex flex-col items-center text-center">
                                <RiTicket2Line size={80} className="text-gray-950 mb-4" />
                                <p className="text-xs font-black uppercase tracking-[0.3em]">Waiting Scan</p>
                            </div>
                        )}
                    </div>

                    {scanResult && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-tighter">
                                <RiTimeLine /> Last Scan: {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}