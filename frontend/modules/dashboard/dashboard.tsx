"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ProductDashboard from "./product/product";
import NewsDashboard from "./news/news";
import ServiceDashboard from "./service/service";
import WarrantyDashboard from "./warranty/warranty";
import UserDashboard from "./user/user";
import { useAuth } from "@/contexts/auth-context";
import InvestorDashboard from "./investor/investor";
import {
    RiServiceLine,
    RiShieldCheckLine,
    RiMacbookLine,
    RiNewspaperLine,
    RiUserSettingsLine,
    RiLineChartLine,
    RiLogoutBoxRLine,
    RiArrowLeftSLine,
    RiArrowRightSLine
} from "react-icons/ri";

const menuIcons: Record<string, React.ReactNode> = {
    service: <RiServiceLine size={20} />,
    warranty: <RiShieldCheckLine size={20} />,
    product: <RiMacbookLine size={20} />,
    news: <RiNewspaperLine size={20} />,
    "Investor Relation": <RiLineChartLine size={20} />,
    user: <RiUserSettingsLine size={20} />,
};

export default function Dashboard() {
    const { logout, user } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const userDept = user?.department.toLowerCase() || 'system';

    const menu: Record<string, string[]> = {
        system: ["service", "warranty", "product", "news", "Investor Relation", "user"],
        cs: ["service"]
    };

    const router = useRouter();
    const searchParams = useSearchParams();
    const sectionFromUrl = searchParams.get("section");

    const activeMenu = useMemo(() => {
        if (sectionFromUrl && menu[userDept]?.includes(sectionFromUrl)) {
            return sectionFromUrl;
        }
        return "service";
    }, [sectionFromUrl, userDept]);

    useEffect(() => {
        if (!sectionFromUrl) {
            router.replace("/dashboard?section=service");
        }
    }, [sectionFromUrl, router]);

    const setMenu = (m: string) => {
        router.push(`/dashboard?section=${m}`);
    };

    return (
        <div className="w-full h-screen flex bg-white text-gray-800">
            <aside className={`${isCollapsed ? "w-20" : "w-58"} border-r border-gray-200 flex flex-col transition-all duration-300 relative shrink-0`}>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-10 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 z-50 text-gray-400 hover:text-(--z-red)"
                >
                    {isCollapsed ? <RiArrowRightSLine size={20} /> : <RiArrowLeftSLine size={20} />}
                </button>

                <div className="p-6 h-20 flex items-center overflow-hidden">
                    <a href="/dashboard" className="block shrink-0">
                        <img
                            src={"/logo-red.svg"}
                            alt="Zyrex"
                            className={`${isCollapsed ? "w-8" : "w-32"} transition-all duration-300`}
                        />
                    </a>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-hidden">
                    {menu[userDept]?.map((m: string) => {
                        const isActive = activeMenu === m;
                        return (
                            <button
                                key={m}
                                onClick={() => {
                                    setMenu(m)
                                    if (isCollapsed) {
                                        setIsCollapsed(!isCollapsed)
                                    }
                                }}
                                title={isCollapsed ? m : ""}
                                className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive
                                    ? "bg-red-50 text-(--z-red) font-semibold"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                <span className={`${isActive ? "text-(--z-red)" : "text-gray-400"} shrink-0 w-6 flex justify-start`}>
                                    {menuIcons[m]}
                                </span>
                                <span className={`capitalize truncate transition-all duration-300 ${isCollapsed ? "opacity-0 w-0" : "opacity-100"}`}>
                                    {m}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <div className="px-4 py-6 border-t border-gray-50">
                    <div className={`flex items-center justify-center gap-3 py-2 rounded-xl border transition-all ${!isCollapsed ? "bg-gray-50/50 border-gray-100" : "bg-transparent border-transparent"}`}>
                        <div className="shrink-0 w-10 h-10 rounded-full bg-(--z-red) flex items-center justify-center text-white shadow-sm font-bold ml-0.5">
                            {user?.username?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className={`duration-300 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                            <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                                {user?.username}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                                <p className="text-[10px] font-semibold text-gray-500 uppercase truncate">
                                    {user?.department}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 mb-2">
                    <button
                        onClick={() => logout()}
                        title={isCollapsed ? "Sign Out" : ""}
                        className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-xs font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                        <RiLogoutBoxRLine size={20} className="shrink-0 flex justify-start" />
                        <span className={`transition-all duration-300 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                            Sign Out
                        </span>
                    </button>
                </div>
            </aside>

            <main className="relative flex-1 h-screen overflow-y-auto flex flex-col bg-gray-50/50">
                <header className="sticky top-0 bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-10 h-20">
                    <h2 className="text-sm font-bold text-gray-900 capitalize">
                        {activeMenu} Dashboard
                    </h2>
                </header>

                <div className="p-8">
                    {activeMenu === "news" && <NewsDashboard />}
                    {activeMenu === "product" && <ProductDashboard />}
                    {activeMenu === "service" && <ServiceDashboard />}
                    {activeMenu === "warranty" && <WarrantyDashboard />}
                    {activeMenu === "Investor Relation" && <InvestorDashboard />}
                    {activeMenu === "user" && <UserDashboard />}
                </div>
            </main>
        </div>
    );
}