"use client";

import { MdCall, MdOutlineEmail } from "react-icons/md";
import { productsNav, supportNav } from "./navbar";
import { FaWhatsapp, FaYoutube, FaFacebook, FaLinkedin } from "react-icons/fa";
import { FaSquareInstagram, FaXTwitter } from "react-icons/fa6";
import { AiFillTikTok } from "react-icons/ai";
import { usePathname } from "next/navigation";


export default function Footer() {
    const pathname = usePathname()
    const slug = pathname.split("/").filter(Boolean).pop();

    if (slug == 'dashboard') {
        return;
    }

    return (
        <>
            <section className="relative px-[6%] md:px-[14%] w-full pt-20 flex flex-col md:flex-row justify-between gap-8 md:gap-0 border-t border-gray-300">
                {/* <img src="/footer-bg.png" alt="Footer" className="absolute -z-10 w-full object-cover object-center" /> */}

                {/* LEFT */}
                <div className="md:w-80">
                    <img src="/logo-red.svg" alt="Zyrex" className="w-42" />
                    <p className="text-xs text-gray-400 mt-4">
                        PT. Zyrexindo Mandiri Buana Tbk. assembles and sells IT products under its own brand name "zyrex."
                        The brand has been registered as a trademark under the Indonesian Trademark and Patent Law
                        (Ministry of Law and Human Rights) since 1996.
                    </p>
                    <div className="flex gap-4 mt-12">
                        <a href="https://www.instagram.com/zyrexindonesia/" target="_blank" className="hover:text-(--z-red)">
                            <FaSquareInstagram size={32} />
                        </a>
                        <a href="https://www.tiktok.com/@zyrex.indonesia?lang=en" target="_blank" className="hover:text-(--z-red)">
                            <AiFillTikTok size={32} />
                        </a>
                        <a href="https://www.youtube.com/channel/UC8zs_k4n2tjcYghvRVZiC5Q" target="_blank" className="hover:text-(--z-red)">
                            <FaYoutube size={32} />
                        </a>
                        <a href="https://www.facebook.com/zyrex.indonesia/" target="_blank" className="hover:text-(--z-red)">
                            <FaFacebook size={32} />
                        </a>
                        <a href="https://www.linkedin.com/company/zyrex-indonesia/" target="_blank" className="hover:text-(--z-red)">
                            <FaLinkedin size={32} />
                        </a>
                        <a href="https://twitter.com/zyrex_indonesia" target="_blank" className="hover:text-(--z-red)">
                            <FaXTwitter size={32} />
                        </a>
                    </div>
                </div>

                {/* CENTER */}
                <div className="w-full flex flex-col md:flex-row gap-8 justify-center text-sm">
                    <div>
                        <p className="mb-4 text-md font-semibold">Products</p>
                        <div className="flex flex-col gap-2">
                            {productsNav.map((item) => (
                                <a
                                    key={item.label}
                                    href={item.link}
                                    className="hover:text-(--z-red) transition-colors"
                                >
                                    {item.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="mb-4 text-md font-semibold">Company</p>
                        <div className="flex flex-col gap-2">
                            <a href="/about-us" className="hover:text-(--z-red) transition-colors">About Us</a>
                            <a href="/news" className="hover:text-(--z-red) transition-colors">News & Events</a>
                            <a href="/investor-relations" className="hover:text-(--z-red) transition-colors">Investor Relations</a>
                            <a href="/career" className="hover:text-(--z-red) transition-colors">Career</a>
                        </div>
                    </div>

                    <div>
                        <p className="mb-4 text-md font-semibold">Support</p>
                        <div className="flex flex-col gap-2">
                            {supportNav.map((s, i) => (
                                <a
                                    key={i}
                                    href={s.link}
                                    className="hover:text-(--z-red) transition-colors"
                                >
                                    {s.label}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT MAP */}
                <div className="md:w-160 h-45 overflow-hidden rounded-lg">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d8827.260685689518!2d106.77470348531263!3d-6.170502248582395!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f7b4b59a5255%3A0x580630693ee8d73c!2sZyrex%20-%20PT%20Zyrexindo%20Mandiri%20Buana!5e0!3m2!1sen!2sid!4v1768813069987!5m2!1sen!2sid"
                        className="w-full h-full border-0"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </div>
            </section>

            <div className="px-[6%] md:px-[14%] w-full py-2 flex flex-col md:flex-row justify-center md:items-center gap-2 md:gap-8 mt-12 text-sm">
                <div className="flex gap-2 items-center"><MdOutlineEmail size={18} />cs@zyrex.com</div>
                <div className="flex gap-2 items-center"><FaWhatsapp size={18} />(+62) 811-9690-0531</div>
                <div className="flex gap-2 items-center"><MdCall size={18} />(+62) 215653311</div>
            </div>

            <section className="px-[6%] md:px-[14%] w-full py-14">
                <p className="text-sm text-gray-400 text-center">Copyright © 2021 Zyrex Official Website. All Rights Reserved.</p>
            </section>
        </>
    );
}
