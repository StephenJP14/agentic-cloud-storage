// modules/dashboard/news/news-editor.tsx
"use client";

import { useEffect, useState } from "react";
import RichTextEditor from "./editor";
import { AddNews, updateNews, NewsType } from "@/services/news"; // Import your new service
import { categories } from "@/modules/news/data";

interface NewsEditorProps {
    data?: NewsType | null;
    onSuccess?: () => void;
}

export default function NewsEditor({ data, onSuccess }: NewsEditorProps) {
    const [content, setContent] = useState(data?.content || "");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (data) {
            setContent(data.content);
            setImagePreview(data.image ? `data:image/png;base64,${data.image}` : null);
        }
    }, [data]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const form = e.currentTarget;
        const formData = new FormData(form);

        // 1. Ambil file image dari formData
        const imageFile = formData.get("image") as File;

        // 2. LOGIKA FIX: Jika sedang UPDATE dan user TIDAK memilih file baru
        // Maka hapus field 'image' dari formData agar backend-go tidak menerima file kosong
        if (data?.ID && (!imageFile || imageFile.size === 0)) {
            formData.delete("image");
        }

        formData.set("content", content);

        const rawDate = formData.get("date") as string;
        if (rawDate) {
            formData.set("date", new Date(rawDate).toISOString());
        }

        try {
            if (data?.ID) {
                await updateNews(data.ID, formData);
                alert("News updated successfully!");
            } else {
                await AddNews(formData as any);
                alert("News added successfully!");
            }
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error("Error:", error);
            alert("Operation failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImagePreview(URL.createObjectURL(file));
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-md p-6">
            <h2 className="text-lg font-bold text-gray-800">
                {data ? `Editing News: ${data.ID}` : "Create New Article"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                    <label className="text-sm text-gray-400">Author</label>
                    <input
                        name="author"
                        defaultValue={data?.author}
                        className="p-2 border border-gray-300 rounded-md"
                        type="text"
                        required
                    />
                </div>

                <div className="flex flex-col">
                    <label className="text-sm text-gray-400">Date</label>
                    <input
                        name="date"
                        defaultValue={data?.date ? new Date(data.date).toISOString().split('T')[0] : ""}
                        className="p-2 border border-gray-300 rounded-md"
                        type="date"
                        required
                    />
                </div>

                <div className="flex flex-col">
                    <label className="text-sm text-gray-400">Category</label>
                    <select
                        name="category"
                        defaultValue={data?.category}
                        className="p-2 border border-gray-300 rounded-md"
                        required
                    >
                        {categories.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-col">
                <label className="text-sm text-gray-400">Title</label>
                <input
                    name="title"
                    defaultValue={data?.title}
                    className="p-2 border border-gray-300 rounded-md"
                    type="text"
                    required
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-400">Thumbnail Image</label>
                <input
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="p-2 border border-gray-300 rounded-md bg-white"
                />
                {imagePreview && (
                    <img src={imagePreview} className="w-48 h-32 object-cover rounded-md border" alt="Preview" />
                )}
            </div>

            <div className="flex flex-col">
                <label className="text-sm text-gray-400 mb-2">Content</label>
                <RichTextEditor value={content} onChange={setContent} />
            </div>

            <div className="flex justify-end mt-6">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-6 py-3 rounded-md text-white transition-colors ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-(--z-red) hover:bg-red-700'
                        }`}
                >
                    {isSubmitting ? "Processing..." : data ? "Update News" : "Publish News"}
                </button>
            </div>
        </form>
    );
}