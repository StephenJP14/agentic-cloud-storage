"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { milestones } from "./data";

gsap.registerPlugin(ScrollTrigger);

export default function Milestones() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (window.innerWidth < 768) return;

        const ctx = gsap.context(() => {
            const track = trackRef.current!;
            const slides = gsap.utils.toArray<HTMLElement>(".milestone-slide");

            const totalWidth = track.scrollWidth;
            const viewportWidth = window.innerWidth;

            gsap.to(track, {
                x: () => -(totalWidth - viewportWidth),
                ease: "none",
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top top",
                    end: () => `+=${totalWidth}`,
                    pin: true,
                    scrub: 0.8,
                    anticipatePin: 1,
                    snap: {
                        snapTo: 1 / (slides.length - 1),
                        duration: 0.3,
                        ease: "power2.out",
                    },
                },
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);


    return (
        <section
            ref={sectionRef}
            className="relative w-full h-screen overflow-hidden text-white"
        >
            {/* Background */}
            <img
                src="/milestones-bg.webp"
                className="absolute inset-0 -z-10 w-full h-full object-cover"
                alt="Milestones"
            />

            {/* Header */}
            <div className="pt-28 pb-10 text-center">
                <h4 className="text-sm md:text-lg text-[#FCAF17] tracking-widest">MILESTONES</h4>
                <h1 className="text-xl md:text-3xl lg:text-4xl font-semibold mt-4 max-w-3xl mx-auto px-4">
                    Every Step Is Part of Our Commitment to Grow and Make an Impact</h1>
            </div>

            {/* Track */}
            <div className="w-full h-[70vh] md:h-[65vh] flex items-center">
                <div
                    ref={trackRef}
                    className="flex gap-6 md:gap-16 lg:gap-32 px-4 md:px-16 lg:px-32 will-change-transform"
                >
                    {milestones.map((m, i) => (
                        <div
                            key={i}
                            className="milestone-slide 
                                        min-w-[85vw] md:min-w-[70vw] lg:min-w-[60vw] 
                                        bg-black/30 backdrop-blur-md 
                                        p-5 md:p-8 lg:p-10 
                                        rounded-xl 
                                        flex flex-col md:flex-row 
                                        gap-4 md:gap-8 
                                        items-start md:items-center 
                                        justify-between 
                                        shadow-xl"
                        >
                            <div className="text-3xl md:text-5xl lg:text-6xl font-bold shrink-0 text-[#FCAF17]">
                                {m.year}
                            </div>
                            <div className="text-sm md:text-base lg:text-lg leading-relaxed max-w-xl">
                                {m.desc}
                            </div>
                            <img
                                src={`/milestones/${m.year}.webp`}
                                alt=""
                                className="w-full md:w-35 lg:w-45 rounded-md object-contain"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}