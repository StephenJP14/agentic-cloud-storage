'use client'

import ShiningButton from "@/components/shared/shining-button";
import { FaShoppingCart } from "react-icons/fa";
import { useState, useEffect } from "react";

interface ProductHighlightProp {
    led?: boolean
}

const highlights = [
    {
        link: '/product/blaze', img: '/highlights/blaze.webp', code: 'blaze',
        url: 'https://shopee.co.id/LAPTOP-ZYREX-BLAZE-I5-12450H-16GB-512GB-W11-14.0-FHD-IPS-2YR-GREY-i.27510377.28012848360?extraParams=%7B%22display_model_id%22%3A241700055241%7D',
    },
    {
        link: '/product/dtech', img: '/highlights/dtech.webp', code: 'dtech',
        url: 'https://shopee.co.id/Laptop-Zyrex-D-TECH-16GB-SSD-256GB-AMD-Ryzen-5-3500U-Windows-11-14-inch-HD-i.27510377.27526739563?extraParams=%7B%22display_model_id%22%3A405490759023%7D',

    },
    {
        link: '/product/ultra', img: '/highlights/ultra.webp', code: 'ultra',
        url: 'https://shopee.co.id/zyrex.id',
    },
]

export default function ProductHighlight({ led = true }: ProductHighlightProp) {
    const [active, setActive] = useState(0)
    const total = highlights.length
    const prev = (active - 1 + total) % total
    const next = (active + 1) % total
    const [displayIndex, setDisplayIndex] = useState(active);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        setDisplayIndex(active);
    }, [active]);

    useEffect(() => {
        const t = setInterval(() => {
            setActive((s) => (s + 1) % highlights.length)
        }, 3500)
        return () => clearInterval(t)
    }, [])


    return (
        <section className="w-full md:h-screen relative text-white flex overflow-hidden">
            {led &&
                <div className="w-[90%] h-4 left-1/2 -translate-x-1/2 shadow-[0_0_120px_40px_rgba(180,180,180,0.4)] bg-linear-to-b from-white to-[rgb(255,255,255,0.4)] absolute top-0 rounded-b-md border-t-4 border-gray-100"></div>
            }
            <img src="/dark-geometry.svg" alt="" className="absolute w-full h-full object-cover -z-10" />
            <img src="/light.png" alt="" className="absolute w-full -z-10 -top-10 animate-pulse-opacity" />
            <div className="px-[6%] md:px-[14%] py-24 md:py-0 md:pt-24 w-full h-screen flex flex-col justify-center gap-12 md:justify-between items-center">
                <h1 className="text-2xl md:text-3xl text-center">Level Up Your <span className="font-bold bg-linear-to-r from-[#fdf1ae] to-[#FFBD3C] text-transparent bg-clip-text">Productivity</span> with Zyrex</h1>
                <div className="w-full h-full flex flex-col-reverse md:flex-row md:justify-between">
                    <div className="relative hidden md:flex items-center justify-center w-full h-full">
                        {highlights.map((item, i) => (
                            <img
                                key={item.code}
                                src={`/products/${item.code}/display-2.png`}
                                alt=""
                                className={`absolute max-h-full max-w-full object-contain transition-all duration-500 ease-in-out ${i === active
                                    ? "opacity-100 scale-100"
                                    : "opacity-0 scale-105"
                                    }`}
                                draggable={false}
                            />
                        ))}
                    </div>
                    <div className="w-full md:w-160 flex flex-col justify-center gap-4">
                        <div className="relative w-auto h-124 overflow-hidden flex items-center justify-center">
                            {highlights.map((item, i) => {
                                const pos = (i - active + total) % total;

                                let className =
                                    "w-full flex flex-col gap-4 absolute transition-all duration-700 ease-in-out rounded-md will-change-transform";

                                if (pos === 0) {
                                    // ACTIVE
                                    className +=
                                        " left-1/2 -translate-x-1/2 scale-100 opacity-100 z-20";
                                } else if (pos === 1) {
                                    // NEXT (kanan)
                                    className +=
                                        " left-1/2 translate-x-[40%] scale-75 opacity-60 z-10";
                                } else if (pos === total - 1) {
                                    // PREV (kiri)
                                    className +=
                                        " left-1/2 -translate-x-[140%] scale-75 opacity-0 z-0";
                                } else {
                                    // HIDDEN
                                    className += " opacity-0 scale-50";
                                }

                                return (
                                    <>
                                        <div
                                            key={i}
                                            className={className}
                                            draggable={false}
                                        >
                                            <img
                                                key={item.code}
                                                src={item.img}
                                                alt=""
                                                draggable={false}
                                                className='rounded-md'
                                            />
                                            <ShiningButton onClick={() => {
                                                window.location.href = item.url
                                            }}>
                                                <><FaShoppingCart size={20} /> Buy now</>
                                            </ShiningButton>
                                        </div>
                                    </>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}