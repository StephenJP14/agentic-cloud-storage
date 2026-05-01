import { getNewsByID, GetNewsByCategory } from "@/services/news"
import NewsDetailClient from "@/modules/news/news-detail"

type PageProps = {
    params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps) {
    const { id } = await params

    const res = await getNewsByID(Number(id))
    const news = res.data.data

    return {
        title: news.title,
        description: news.content || news.title,
        openGraph: {
            title: news.title,
            description: news.content,
        },
    }
}

export default async function NewsDetailPage({ params }: PageProps) {
    const { id } = await params

    const newsRes = await getNewsByID(Number(id))
    const news = newsRes.data.data

    const moreRes = await GetNewsByCategory(news.category)
    const moreNews = moreRes.data.data

    return (
        <NewsDetailClient
            news={news}
            moreNews={moreNews}
        />
    )
}
