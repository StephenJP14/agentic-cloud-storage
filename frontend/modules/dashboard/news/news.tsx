// modules/dashboard/news/news.tsx
'use client'

import { deleteNews, getNews, NewsType } from "@/services/news";
import NewsEditor from "./news-editor";
import { useEffect, useState } from "react";

export default function NewsDashboard() {
    const [activeMenu, setActiveMenu] = useState<'data' | 'create' | 'update'>('data');
    const [news, setNews] = useState<NewsType[] | null>(null);
    const [selectedNews, setSelectedNews] = useState<NewsType | null>(null);

    const fetchNews = async () => {
        const res = await getNews();
        setNews(res.data.data);
    };

    const handleEditClick = (item: NewsType) => {
        setSelectedNews(item);
        setActiveMenu('update'); // Switch to editor mode
    };

    const handleDeleteNews = async (id: number) => {
        const isConfirmed = window.confirm("Confirm Delete News.");
        if (!isConfirmed) return;

        try {
            await deleteNews(id);

            alert("Berita berhasil dihapus!");
            fetchNews();
        } catch (error) {
            console.error("Delete error:", error);
            alert("Gagal menghapus berita. Silakan coba lagi.");
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    return (
        <>
            <div className="flex">
                <button
                    onClick={() => { setActiveMenu('data'); setSelectedNews(null); }}
                    className={`py-2 px-8 border-b-2 ${activeMenu == 'data' ? 'border-(--z-red) text-white bg-(--z-red)' : 'border-gray-300'} rounded-t-md`}
                >
                    Data
                </button>
                <button
                    onClick={() => { setActiveMenu('create'); setSelectedNews(null); }}
                    className={`py-2 px-8 border-b-2 ${activeMenu == 'create' ? 'border-(--z-red) text-white bg-(--z-red)' : 'border-gray-300'} rounded-t-md`}
                >
                    Create
                </button>
            </div>

            <section className="w-full h-[82vh] overflow-y-auto border border-gray-300 bg-white">
                {activeMenu === 'data' && (
                    <div className="w-full h-full overflow-y-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-gray-700 text-white sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 text-left">ID</th>
                                    <th className="p-3 text-left">Title</th>
                                    <th className="p-3 text-left">Author</th>
                                    <th className="p-3 text-left">Category</th>
                                    <th className="p-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {news?.map((n) => (
                                    <tr key={n.ID} className="hover:bg-gray-50">
                                        <td className="p-3 border-b border-gray-300">{n.ID}</td>
                                        <td className="p-3 border-b border-gray-300 font-medium">{n.title}</td>
                                        <td className="p-3 border-b border-gray-300">{n.author}</td>
                                        <td className="p-3 border-b border-gray-300">{n.category}</td>
                                        <td className="p-3 border-b border-gray-300 flex gap-2">
                                            <button onClick={() => handleDeleteNews(n.ID)} className="p-2 bg-red-100 text-red-700 rounded-md">Delete</button>
                                            <button
                                                onClick={() => handleEditClick(n)}
                                                className="p-2 bg-yellow-100 text-yellow-800 rounded-md"
                                            >
                                                Update
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {(activeMenu === 'create' || activeMenu === 'update') && (
                    <NewsEditor
                        data={selectedNews}
                        onSuccess={() => { setActiveMenu('data'); fetchNews(); }}
                    />
                )}
            </section>
        </>
    );
}