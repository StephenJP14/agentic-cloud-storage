type PaginationControlsProps = {
    searchParams: any;
    setSearchParams: any;
    limits?: number[];
};

import { useEffect, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function PaginationControls({
    searchParams,
    setSearchParams,
    limits = [25, 50, 100, 150, 200, 250], // ✅ default
}: PaginationControlsProps) {
    const pageRef = useRef<HTMLInputElement>(null);
    const [pageInput, setPageInput] = useState("");

    useEffect(() => {
        setPageInput(String(searchParams.page));
    }, [searchParams.page]);

    const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLimit = Number(e.target.value);
        setSearchParams((prev: any) => ({
            ...prev,
            limit: newLimit,
            page: 1,
        }));
    };

    const handlePrev = () => {
        setSearchParams((prev: any) => ({
            ...prev,
            page: Math.max(1, Number(prev.page) - 1),
        }));
    };

    const handleNext = () => {
        setSearchParams((prev: any) => ({
            ...prev,
            page: Number(prev.page) + 1,
        }));
    };

    const handlePageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const raw = pageInput.trim();
            if (!raw) return;

            const num = Number(raw);
            if (isNaN(num) || num < 1) {
                setPageInput(String(searchParams.page));
                return;
            }

            setSearchParams((prev: any) => ({
                ...prev,
                page: num,
            }));
        }
    };

    return (
        <div className="flex gap-4 items-center">
            {/* LIMIT */}
            <div className="flex gap-1 text-sm items-center">
                <p>Limit:</p>
                <select
                    className="bg-white p-2 h-9 border border-gray-200 rounded-md focus:outline-none"
                    onChange={handleLimitChange}
                    value={searchParams.limit}
                >
                    {limits.map((item, i) => (
                        <option key={i} value={item}>
                            {item}
                        </option>
                    ))}
                </select>
            </div>

            {/* PAGE */}
            <div className="flex items-center gap-1 text-sm">
                Page:
                <div className="p-2 h-9 gap-2 flex items-center justify-center bg-white rounded-md border border-gray-200">
                    <button
                        onClick={handlePrev}
                        disabled={searchParams.page === 1}
                        className="cursor-pointer disabled:opacity-30"
                    >
                        <FaChevronLeft />
                    </button>

                    <input
                        className="w-8 focus:outline-none text-center"
                        type="text"
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        onKeyDown={handlePageKeyDown}
                    />

                    <button
                        onClick={handleNext}
                        className="cursor-pointer"
                    >
                        <FaChevronRight />
                    </button>
                </div>
            </div>
        </div>
    );
}
