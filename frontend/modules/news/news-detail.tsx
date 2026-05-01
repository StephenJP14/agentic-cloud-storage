'use client'

import { NewsType } from "@/services/news"
import { formatDate, toTitleCase } from "@/utils/string"
import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useNavStyle } from "@/contexts/navbar-context"

type Props = {
    news: NewsType
    moreNews: NewsType[]
}

export default function NewsDetailClient({ news, moreNews }: Props) {
    const { setVariant } = useNavStyle()
    const router = useRouter()

    useEffect(() => {
        setVariant('a')
    }, [])

    const memoizedMoreNews = useMemo(() => {
        return moreNews
            .filter(item => item.ID !== news.ID)
            .slice(0, 4)
    }, [moreNews, news.ID])

    return (
        <section className="px-[6%] md:px-[14%] w-full min-h-screen py-32 flex flex-col md:flex-row gap-24">
            {/* MAIN */}
            <div className="w-full flex flex-col gap-8">
                <div>
                    {news.image && (
                        <img
                            src={`data:image/png;base64,${news.image}`}
                            alt={news.title}
                            className="w-full max-h-105 object-cover rounded-lg mb-6"
                        />
                    )}

                    <p className="text-sm text-(--z-red) font-semibold uppercase">
                        {news.category}
                    </p>
                    <h1 className="font-semibold text-2xl md:text-4xl">
                        {news.title}
                    </h1>
                </div>


                <p className="text-sm text-gray-500 mt-2">
                    {formatDate(news.date)} • {news.author}
                </p>

                <div
                    className="[&_p]:mb-4 [&_h4]:mt-8 [&_h4]:mb-4"
                    dangerouslySetInnerHTML={{ __html: news.content }}
                />
            </div>

            {/* SIDEBAR */}
            <aside className="md:w-80 sticky top-32">
                <p className="text-xl font-semibold mb-8">
                    More {toTitleCase(news.category)}
                </p>

                {memoizedMoreNews.map((m) => (
                    <div
                        key={m.ID}
                        onClick={() => router.push(`/news/${m.ID}`)}
                        className="cursor-pointer mb-6 group"
                    >
                        {m.image && (
                            <img
                                src={`data:image/png;base64,${m.image}`}
                                alt={m.title}
                                className="rounded-md mb-2"
                            />
                        )}

                        <p className="group-hover:text-(--z-red) font-semibold">
                            {m.title}
                        </p>
                        <p className="text-sm text-gray-500">
                            {formatDate(m.date)} | {m.author}
                        </p>
                    </div>
                ))}
            </aside>
        </section>
    )
}
