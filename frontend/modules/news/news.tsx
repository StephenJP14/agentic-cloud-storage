'use client'

import { useNavStyle } from "@/contexts/navbar-context";
import { categories } from "./data";
import { useEffect, useState } from "react";
import { getNews, NewsCategory, NewsType } from "@/services/news";
import { formatDate } from "@/utils/string";
import { useRouter } from "next/navigation";

export default function News() {
    const router = useRouter()
    const { setVariant } = useNavStyle()
    setVariant('b')
    const [active, setActive] = useState<NewsCategory>('')
    const [news, setNews] = useState<NewsType[] | null>(null)

    const fetchNews = async () => {
        const res = await getNews()
        setNews(res.data.data)
    }

    useEffect(() => {
        fetchNews()
    }, [])

    return (
        <>
            <section className="relative w-full h-[20vh] md:h-[50vh]">
                <img
                    src="/news-bg.webp"
                    alt="News Zyrex"
                    className="absolute -z-10 w-full h-full object-cover"
                />
                <div className="px-[6%] md:px-[14%] w-full h-full flex items-center">
                    <h1 className="text-white font-bold text-2xl md:text-4xl md:w-4/5">News & Events</h1>
                </div>
            </section>

            <section className="px-4 sm:px-[6%] md:px-[10%] lg:px-[14%] mt-8 w-full">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide border-b border-gray-200">

                    {categories.map((c, i) => (
                        <button
                            key={i}
                            onClick={() => setActive(c.value)}
                            className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition
                    ${active == c.value
                                    ? 'border-(--z-red) text-(--z-red)'
                                    : 'border-transparent text-gray-500 hover:text-(--z-red)'
                                }
                `}
                        >
                            {c.label}
                        </button>
                    ))}

                </div>
            </section>

            <section className="px-[6%] md:px-[14%] mt-6 mb-12 w-full grid grid-cols-1 md:grid-cols-4 gap-12">
                {news == null || news?.length === 0 && (
                    <p>No News Available.</p>
                )}
                {news?.map((n, i) => (
                    <div onClick={() => router.push(`/news/${n.ID}`)} key={i} className="flex flex-col gap-2 cursor-pointer">
                        <img src={`data:image/png;base64,${n.image}`} alt="News" className="w-full" />
                        <b className="text-(--z-red) mt-4">{n.category.toUpperCase()}</b>
                        <h2 className="text-lg font-semibold">{n.title}</h2>
                        <i className="text-xs text-gray-500">{formatDate(n.date)} | {n.author}</i>
                    </div>
                ))}
            </section>
        </>
    )
}