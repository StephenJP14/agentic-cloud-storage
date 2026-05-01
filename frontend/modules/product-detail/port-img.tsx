"use client";
import Image from "next/image";
import { useState } from "react";

export default function PortImage({ productCode }: { productCode: string }) {
    const [error, setError] = useState(false);

    return (
        <section className="px-[6%] md:px-[14%] mb-32 h-screen w-full flex gap-12 flex-col justify-center items-center text-center">
            {!error && (
                <Image
                    src={
                        error
                            ? "/products/dtechpro/port-dtechpro.svg"
                            : `/products/${productCode}/port-${productCode}.svg`
                    }
                    alt="Zyrex Product"
                    width={800}
                    height={600}
                    className={`md:h-full md:w-400 ${error ? 'hidden' : 'block'}`}
                    onError={() => setError(true)}
                />
            )}
            <div className="flex flex-col justify-center items-center gap-4">
                <h3 className="text-2xl font-semibold bg-linear-to-r from-[#E8592A] to-[#912A7F] bg-clip-text text-transparent w-fit">Complete Connectivity</h3>
                <p className="text-xl md:w-2/3">Everything you need for presentations, fast data transfers, and connecting all your devices.</p>
            </div>
        </section>
    );
}
