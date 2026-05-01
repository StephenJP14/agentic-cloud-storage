"use client"

import { useNavStyle } from "@/contexts/navbar-context";
import { FaCheckCircle } from "react-icons/fa";
import Milestones from "./milestones";
import { coreValues, boards } from "./data";

export function AboutUs() {
    const { setVariant } = useNavStyle()
    setVariant('b')

    return (
        <>
            <section className="relative w-full h-[60vh] overflow-hidden">
                <img src="/about-us/hero-about-us.webp" alt="Hero" className="w-full h-full absolute -z-10 object-cover object-bottom" />

                <div className="absolute inset-0 flex items-center p-8 px-[6%] md:px-[14%]">
                    <span className="text-4xl font-bold text-white text-center md:text-left">
                        Zyrex Moving Forward
                        <br />
                        <h1 className="font-bold text-amber-400">
                            Towards the Future
                        </h1>
                    </span>
                </div>
            </section>

            <section className={"flex flex-col md:flex-row items-center h-full px-[6%] md:px-[14%] py-24 gap-12 justify-between"}>
                <div className="flex flex-col">
                    <h1 className="text-xl font-semibold">ABOUT US</h1>
                    <div className="flex flex-col md:w-3/4 mt-4 md:mt-6">
                        <p className="md:text-lg">
                            Zyrex was founded on the belief that technology should be accessible, relevant, and create real impact for people across Indonesia.
                        </p>
                        <br />
                        <p className={"md:text-lg"}>
                            As a local laptop brand, we are committed to delivering devices that support learning, working, and growing not only for today, but also for the future.
                        </p>
                    </div>
                </div>
                <img src="/about-us/about-us.webp" alt="tentang-kami" />
            </section>

            <Milestones />

            <section className="px-[6%] md:px-[14%] py-24 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-2xl font-semibold mb-4 text-(--z-red)">Vision</h2>
                        <p className={"text-lg"}>
                            To be a pioneer in Information and Communication Technology (ICT) and
                            the Internet of Things (IoT), with the aim of increasing efficiency
                            and effectiveness in all areas of life.
                        </p>
                    </div>

                    <img
                        src="/about-us/visi.webp"
                        alt="Vision"
                        className="rounded-xl shadow-sm object-cover w-full"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <img
                        src="/about-us/misi.webp"
                        alt="Mission"
                        className="rounded-xl shadow-sm object-cover w-full"
                    />

                    <div className="relative pl-8">
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200" />

                        <h2 className="text-2xl font-semibold mb-4 text-(--z-red)">Mision</h2>

                        <ul className="space-y-4 text-lg">
                            <li className="flex items-center gap-4">
                                <FaCheckCircle size={24} color="#A41E22" />
                                Engineer reliable technology solutions specifically for the needs
                                of Indonesia.
                            </li>
                            <li className="flex items-center gap-4">
                                <FaCheckCircle size={24} color="#A41E22" />
                                Make technology accessible and affordable to bridge the nation's
                                digital divide.
                            </li>
                            <li className="flex items-center gap-4">
                                <FaCheckCircle size={24} color="#A41E22" />
                                Champion national progress through dedicated local support and
                                innovation.
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="px-[6%] md:px-[14%] w-full py-24 flex flex-col justify-center items-center">
                <h1 className="font-semibold text-3xl mb-12">Meet The Boards</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {boards.map((b, i) => (
                        <div key={i} className="p-4 flex flex-col items-center justify-center gap-2 text-center border border-gray-300 rounded-md hover:-translate-y-2 hover:shadow-xl transition-all">
                            <img src={b.photo} alt={b.name} className="w-80 h-auto" />
                            <h4 className="text-xl font-semibold mt-4">{b.name}</h4>
                            <i className="text-(--z-red)">{b.title}</i>
                        </div>
                    ))}
                </div>

            </section>

            <section className="w-full py-24 px-[6%] md:px-[14%]">
                <div className={"flex flex-col items-center text-center gap-4"}>
                    <h3 className={"text-2xl text-red-800 font-bold"}>
                        VALUES
                    </h3>
                    <h1 className={"text-2xl md:text-3xl font-semibold text-center md:w-2/3"}>The Principles Behind Our Progress</h1>
                </div>

                <div className=" mx-auto md:px-6 py-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {coreValues.map((value) => (
                            <div
                                key={value.tag}
                                className="border border-gray-300 rounded-md p-6 flex flex-col justify-between gap-4 md:h-52 cursor-pointer hover:border-(--z-red)"
                            >
                                <div className="flex gap-4 items-center">
                                    <img
                                        src={`/icons/${value.tag}.svg`}
                                        alt={value.title}
                                        className="w-10 h-10 shrink-0"
                                    />
                                    <h3 className="text-xl font-semibold">
                                        {value.title}
                                    </h3>
                                </div>

                                <p className="md:text-lg text-black leading-relaxed">
                                    {value.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    )
}