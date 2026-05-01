"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { testimonials } from "./data";
const ITEM_HEIGHT = 140;
import { FaUserCircle } from "react-icons/fa";

export default function TestimonialCarousel() {
  const [index, setIndex] = useState(0);

  // auto slide
  useEffect(() => {
    const t = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // bikin infinite loop buffer
  const extended = [
    ...testimonials.slice(-5),
    ...testimonials,
    ...testimonials.slice(0, 5),
  ];

  const centerIndex = index + 5;

  return (
    <section className="px-[6%] md:px-[14%] py-12 w-full min-h-screen flex flex-col md:flex-row justify-center items-center gap-16 md:gap-24">
      <div>
        <p className="font-semibold text-[#FFBD3C]">TESTIMONIALS</p>
        <h1 className="text-2xl md:text-3xl font-semibold">What Our Customers Say About Zyrex</h1>
      </div>
      <div className="relative h-175 w-full md:w-130 overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-0 w-full h-24 bg-linear-to-b from-white to-transparent z-10" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-full h-24 bg-linear-to-t from-white to-transparent z-10" />

        <motion.div
          animate={{
            y: -(centerIndex * ITEM_HEIGHT),
          }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1], // smooth like iOS
          }}
          className="absolute top-1/2 left-0 w-full"
          style={{
            transform: `translateY(${ITEM_HEIGHT / 2}px)`,
          }}
        >
          {extended.map((item, i) => {
            const isActive = i === centerIndex;

            return (
              <div
                key={i}
                style={{ height: ITEM_HEIGHT }}
                className="flex items-center justify-center"
              >
                <div
                  className={`w-full rounded-xl transition-all duration-500 ${isActive
                    ? "border-2 border-[#FFBD3C] shadow-2xl bg-white p-4 md:p-6 z-20"
                    : "border border-gray-200 bg-white p-2 md:p-4 scale-95 opacity-80"
                    }`}
                >
                  <div className="flex gap-3 items-center mb-3">
                    {/* <img
                      src={item.avatar}
                      className="w-8 h-8 rounded-full"
                    /> */}
                    <FaUserCircle size={20} />
                    <p className="text-sm md:text-md font-semibold">{item.name}</p>
                  </div>

                  <p className="text-xs md:text-sm">{item.text}</p>

                  {isActive && (
                    <p className="text-end text-xs text-gray-400 mt-3">
                      From {item.source}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>

  );
}
