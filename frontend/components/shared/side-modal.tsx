import {useCallback, useEffect, useRef, useState} from "react";
import {FaChevronRight} from "react-icons/fa6";

interface SideModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    width?: string;
    closeDuration?: number;
}

export default function SideModal({isOpen, onClose, children, width = "sm:w-1/3", closeDuration = 300,}: SideModalProps) {
    const [closing, setClosing] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const handleClose = useCallback(() => {
        setClosing(true);
        timeoutRef.current = window.setTimeout(() => {
            setClosing(false);
            onClose(); // parent state setIsModalOpen(false)
        }, closeDuration);
    }, [onClose, closeDuration]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Render modal jika isOpen true atau sedang closing
    if (!isOpen && !closing) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end max-h-screen">
            <div
                onClick={handleClose}
                className="absolute inset-0 bg-linear-to-l from-black/30 to-transparent transition-opacity"
            />
            <div
                className={`relative ${width} bg-white shadow-2xl h-full p-6
          ${closing ? "modal-exit" : "modal-enter"}`}
            >
                <button
                    onClick={handleClose}
                    className="z-100 absolute top-1/2 p-2 -translate-x-4 left-0 bg-white rounded-full w-9 h-9 flex items-center justify-center shadow-xl cursor-pointer"
                >
                    <FaChevronRight size={16} color="black"/>
                </button>
                {children}
            </div>
        </div>
    );
}
