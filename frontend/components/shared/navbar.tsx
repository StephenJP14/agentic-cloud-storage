"use client"
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FaShoppingCart, FaChevronDown, FaChevronUp, FaWifi, FaChevronRight } from "react-icons/fa";
import { CiServer } from "react-icons/ci";
import { IoMdLaptop } from "react-icons/io";
import { SlScreenDesktop } from "react-icons/sl";
import { BsTv } from "react-icons/bs";
import { useNavStyle } from "@/contexts/navbar-context";
import { LuPcCase } from "react-icons/lu";
import { getCartLength } from "@/utils/cart";
import { MdCall } from "react-icons/md";
import { usePathname } from "next/navigation";

const dropdownVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
};

export const productsNav = [
    { label: "Laptops", link: "/products?productType=laptop", icon: <IoMdLaptop size={22} /> },
    { label: "Desktops", link: "/products?productType=desktop", icon: <LuPcCase size={22} /> },
    { label: "Servers", link: "/products?productType=server", icon: <CiServer size={22} /> },
    { label: "AIO", link: "/products?productType=aio", icon: <SlScreenDesktop size={22} /> },
    { label: "Displays", link: "/products?productType=display", icon: <SlScreenDesktop size={22} /> },
    { label: "Smart TV", link: "/products?productType=tv", icon: <BsTv size={22} /> },
    { label: "IOT and Accessories", link: "/products?productType=iot", icon: <FaWifi size={22} /> },
];

export const supportNav = [
    { label: 'Service Center', link: '/service-center' },
    { label: 'Book Service', link: '/service' },
    { label: 'Check Warranty', link: '/warranty-check' },
    { label: 'Claim Warranty', link: '/warranty-reg' },
    { label: 'Contact', link: '/contact' },
    { label: 'Download Driver', link: '/driver' },
]


export default function Navbar() {
    const pathname = usePathname()
    const slug = pathname.split("/").filter(Boolean).pop();

    if (slug == 'dashboard') {
        return;
    }

    const [mobileOpen, setMobileOpen] = useState(false)
    const [mobileSub, setMobileSub] = useState<null | "products" | "support">(null)

    const navAreaRef = useRef<HTMLDivElement>(null)
    const { variant } = useNavStyle()
    const [openMenu, setOpenMenu] = useState<null | "products" | "support">(null)
    const [scrolled, setScrolled] = useState(false)
    const navClass =
        openMenu || scrolled || variant === "a"
            ? "bg-white/80 backdrop-blur-2xl text-black border-b border-gray-200"
            : "bg-transparent text-white border-none"

    const open = (menu: "products" | "support") => setOpenMenu(menu)
    const close = () => setOpenMenu(null)

    const [cartLength, setCartLength] = useState(0)

    useEffect(() => {
        setCartLength(getCartLength())
        const onScroll = () => {
            setScrolled(window.scrollY > 10)
        }
        window.addEventListener("scroll", onScroll)
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    return (
        <>
            <a
                className="fixed z-100 right-8 md:right-15 bottom-28 md:bottom-34 hover:-translate-y-2 hover:scale-110 transition-all cursor-pointer"
                href="https://api.whatsapp.com/send/?phone=6281196900531&text=Hallo+admin%2C+saya+ingin+bertanya%0ANama+%3A%0AMerk+Laptop+%3A%0AAlamat+%3A%0ANo.Telp+%3A&type=phone_number&app_absent=0"
            >
                <img src="/wa.svg" alt="WhatsApp" className="w-20" />
            </a>
            <div
                ref={navAreaRef}
                className="fixed top-0 left-0 w-full z-50"
                onMouseLeave={() => setOpenMenu(null)}
            >
                <nav
                    className={`fixed top-0 z-50 w-full h-16 grid grid-cols-[auto_1fr_auto] gap-4 items-center px-[4%] md:px-[14%] transition-all duration-300 text-md ${navClass}`}
                >
                    <a href="/" className="relative h-full flex justify-center items-center">
                        <img src="/logo-white.svg" alt="" className="w-24 z-30" />
                        <img src="/logo-flag.svg" alt="" className="absolute z-10 translate-y-3" />
                    </a>

                    <div className="hidden md:flex justify-center gap-6 items-center w-full">
                        <div className="hidden md:flex justify-center gap-6 items-center w-full">
                            <div
                                onMouseEnter={() => open("products")}
                                className="cursor-pointer flex items-center gap-1"
                            >
                                Products {openMenu === "products" ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                            </div>

                            <a onMouseEnter={close} href="/about-us">About</a>
                            <a onMouseEnter={close} href="/news">News</a>
                            <a onMouseEnter={close} href="/investor-relations">Investor Relations</a>
                            <a onMouseEnter={close} href="/career">Career</a>

                            <div
                                onMouseEnter={() => open("support")}
                                className="cursor-pointer flex items-center gap-1"
                            >
                                Support {openMenu === "support" ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                            </div>

                        </div>

                    </div>

                    <div className="flex gap-4 items-center justify-end">
                        {/* <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full border bg-white text-gray-700 border-gray-300">
                        <input type="text" className="outline-none" placeholder="Search..." />
                        <FaSearch />
                    </div> */}
                        <a href="mailto:sales@zyrex.com" className="flex gap-1 items-center px-3 py-2 bg-(--z-red) text-white rounded-full text-sm">
                            <MdCall size={20} /> Contact Sales
                        </a>
                        {/* <a href="/cart" className="relative hidden md:block">
                            <FaShoppingCart size={24} />
                            {cartLength !== 0 && (
                                <div className="absolute bg-(--z-red) w-5 h-5 flex items-center text-xs -top-2 -right-2 justify-center rounded-full text-white">
                                    {cartLength}
                                </div>
                            )}
                        </a> */}
                        <button
                            className="md:hidden text-2xl"
                            onClick={() => setMobileOpen(true)}
                        >
                            ☰
                        </button>
                    </div>

                    <AnimatePresence>
                        {openMenu && (
                            <motion.div
                                className="w-full h-screen absolute top-full left-0 flex flex-col"
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                variants={dropdownVariants}
                                transition={{ duration: 0.25 }}
                            >
                                <div className="px-[14%] w-full bg-[rgb(250,250,250)] flex justify-between items-center shadow-2xl border-t border-gray-300">

                                    {openMenu === "products" && (
                                        <>
                                            <div className="flex gap-24 py-6">
                                                <span className="font-semibold text-xl">Products</span>
                                                <div className="flex flex-col gap-6">
                                                    <a href='/products' className="flex gap-2 items-center hover:text-(--z-red)">
                                                        All Products
                                                    </a>
                                                    {productsNav.map((item) => (
                                                        <a key={item.label} href={item.link} className="flex gap-2 items-center hover:text-(--z-red)">
                                                            {item.icon}
                                                            {item.label}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                            <img src="/design.webp" className="h-[40vh]" />
                                        </>
                                    )}

                                    {openMenu === "support" && (
                                        <>
                                            <div className="flex gap-24 py-6">
                                                <span className="font-semibold text-xl">Support</span>
                                                <div className="flex flex-col gap-6">
                                                    {supportNav.map((s) => (
                                                        <a key={s.label} href={s.link} className="hover:text-(--z-red)">
                                                            {s.label}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                            <img src="/service-center.webp" className="h-[40vh]" />
                                        </>
                                    )}

                                </div>

                                <motion.div
                                    className="w-full h-full backdrop-blur-sm bg-black/40"
                                    onClick={close}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {mobileOpen && (
                            <>
                                <motion.div
                                    className="fixed inset-0 bg-white z-40"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setMobileOpen(false)}
                                />

                                <motion.div
                                    className="fixed top-0 right-0 w-[80%] h-screen bg-white text-black z-50 shadow-2xl flex flex-col"
                                    initial={{ x: "100%" }}
                                    animate={{ x: 0 }}
                                    exit={{ x: "100%" }}
                                    transition={{ type: "tween", duration: 0.3 }}
                                >
                                    <div className="p-6 flex flex-col gap-4">

                                        <div className="flex justify-between items-center mb-4 border-b pb-4 border-gray-300">
                                            <img src="/logo-red.svg" className="h-4" />
                                            <button onClick={() => setMobileOpen(false)}>✕</button>
                                        </div>

                                        <div>
                                            <button
                                                className="w-full flex justify-between items-center py-0 font-semibold"
                                                onClick={() =>
                                                    setMobileSub(mobileSub === "products" ? null : "products")
                                                }
                                            >
                                                Products
                                                <FaChevronDown
                                                    className={`transition ${mobileSub === "products" ? "rotate-180" : ""}`}
                                                />
                                            </button>

                                            <AnimatePresence>
                                                {mobileSub === "products" && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden pl-4 pt-2 flex flex-col gap-3"
                                                    >
                                                        {productsNav.map((p) => (
                                                            <a
                                                                key={p.label}
                                                                href={p.link}
                                                                onClick={() => setMobileOpen(false)}
                                                                className="py-1"
                                                            >
                                                                {p.label}
                                                            </a>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>


                                        <a className="font-semibold" href="/about-us" onClick={() => setMobileOpen(false)}>About Us</a>
                                        <a className="font-semibold" href="/news" onClick={() => setMobileOpen(false)}>News & Events</a>
                                        <a className="font-semibold" href="/investor-relations" onClick={() => setMobileOpen(false)}>Investor Relations</a>
                                        <a className="font-semibold" href="/career" onClick={() => setMobileOpen(false)}>Career</a>

                                        <div>
                                            <button
                                                className="w-full flex justify-between items-center py-0 font-semibold"
                                                onClick={() =>
                                                    setMobileSub(mobileSub === "support" ? null : "support")
                                                }
                                            >
                                                Support
                                                <FaChevronDown
                                                    className={`transition ${mobileSub === "support" ? "rotate-180" : ""}`}
                                                />
                                            </button>

                                            <AnimatePresence>
                                                {mobileSub === "support" && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden pl-4 pt-2 flex flex-col gap-3"
                                                    >
                                                        {supportNav.map((s) => (
                                                            <a
                                                                key={s.label}
                                                                href={s.link}
                                                                onClick={() => setMobileOpen(false)}
                                                                className="py-1"
                                                            >
                                                                {s.label}
                                                            </a>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </nav>
            </div>
        </>
    )
}