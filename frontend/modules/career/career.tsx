'use client'

import { useNavStyle } from "@/contexts/navbar-context";
import { FaSearch } from "react-icons/fa";

const careers = [
    {
        id: 1,
        title: 'Network Operations'
    }
]

export default function Career() {
    const { setVariant } = useNavStyle()
    setVariant('b')

    return (
        <>
            <section className="relative w-full h-[40vh] md:h-[50vh]">
                <img
                    src="/career-bg.webp"
                    alt="Career Zyrex"
                    className="w-full h-full object-cover"
                />
            </section>

            <section className="px-[6%] md:px-[14%] py-6 md:py-12 relative w-full flex flex-col md:flex-row gap-12 md:gap-0 justify-between">
                <div className="flex flex-col gap-4">
                    <h1 className="font-bold text-2xl md:text-4xl">Grow and Move Forward with Zyrex</h1>
                    <p className="md:w-2/3">Build your career, unlock your potential, and make a real impact with Indonesia’s technology brand.</p>
                </div>
            </section>

            <section className="px-[6%] md:px-[14%] py-12 w-full min-h-[40vh]">
                <p className="text-gray-400">There are currently no open positions available.</p>
            </section>
        </>
    )
}