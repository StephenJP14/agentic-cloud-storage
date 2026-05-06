"use client";

import React, { useState, useEffect, ChangeEvent, DragEvent } from 'react';
// Menggunakan Hi (Heroicons v1) dan Md (Material Design) yang lebih umum tersedia
import { 
    HiDocumentText, 
    HiUpload, 
    HiViewGrid, 
    HiViewList, 
    HiPlus,
    HiInformationCircle
} from 'react-icons/hi';
import { 
    MdStorage, 
    MdArrowDropDown, 
    MdCloudUpload 
} from 'react-icons/md';

interface MinioFile {
    name: string;
    size: number;
}

const API_BASE_URL = 'http://localhost:8000';

export default function ServiceFiles() {
    const [files, setFiles] = useState<MinioFile[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/files/`);
            if (response.ok) {
                const data = await response.json();
                setFiles(data.files);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFiles(); }, []);

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/upload/`, { method: 'POST', body: formData });
            if (res.ok) fetchFiles();
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) uploadFile(e.target.files[0]);
    };

    const onDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => setIsDragging(false);

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) uploadFile(e.dataTransfer.files[0]);
    };

    return (
        <div 
            className="flex h-screen bg-[#F8F9FA] text-[#1F1F1F] font-sans selection:bg-blue-100"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {/* Sidebar */}
            <aside className="w-64 flex flex-col p-4">
                <div className="flex items-center gap-2 px-2 mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl">D</div>
                    <span className="text-xl text-[#5F6368]">Drive</span>
                </div>

                <label className="flex items-center gap-3 bg-white hover:shadow-md border border-gray-100 transition-shadow px-5 py-4 rounded-2xl cursor-pointer w-fit mb-6 group">
                    <HiPlus className="text-2xl text-blue-600" />
                    <span className="text-sm font-medium pr-2">New</span>
                    <input type="file" className="hidden" onChange={handleFileChange} />
                </label>

                <nav className="flex-1">
                    <div className="flex items-center gap-3 px-4 py-2 bg-blue-100 text-blue-800 rounded-full cursor-pointer transition-colors">
                        <MdStorage className="text-xl" />
                        <span className="text-sm font-medium">My Drive</span>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 flex flex-col m-2 bg-white rounded-2xl border border-gray-200 transition-all overflow-hidden ${isDragging ? 'ring-4 ring-blue-400 ring-inset opacity-60' : ''}`}>
                
                {/* Internal Header */}
                <header className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors">
                        <h2 className="text-lg">My Drive</h2>
                        <MdArrowDropDown className="text-xl" />
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                        <button 
                            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            {viewMode === 'list' ? <HiViewGrid size={20} /> : <HiViewList size={20} />}
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <HiInformationCircle size={20} />
                        </button>
                    </div>
                </header>

                {/* File Area */}
                <div className="flex-1 overflow-y-auto p-4">
                    {uploading && (
                        <div className="mb-4 px-4 py-2 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg animate-pulse border border-blue-100">
                            Uploading to MinIO storage...
                        </div>
                    )}

                    {files.length === 0 && !loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <MdCloudUpload size={80} className="text-gray-100 mb-2" />
                            <p className="text-lg font-medium text-gray-500">Ayo upload file</p>
                            <p className="text-sm">Tarik file ke sini atau klik tombol "New"</p>
                        </div>
                    ) : (
                        viewMode === 'list' ? (
                            <table className="w-full text-left">
                                <thead className="text-xs font-medium text-gray-500 border-b border-gray-100 sticky top-0 bg-white">
                                    <tr>
                                        <th className="px-4 py-2 font-semibold">Name</th>
                                        <th className="px-4 py-2 font-semibold text-right">Size</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {files.map((file, i) => (
                                        <tr key={i} className="hover:bg-blue-50/30 group cursor-default transition-colors">
                                            <td className="px-4 py-3 flex items-center gap-3">
                                                <HiDocumentText className="text-blue-500 text-xl" />
                                                <span className="text-sm text-gray-700 truncate max-w-md font-medium">{file.name}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-500 font-mono">
                                                {(file.size / (1024 * 1024)).toFixed(1)} MB
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                {files.map((file, i) => (
                                    <div key={i} className="flex flex-col border border-gray-200 rounded-xl hover:bg-gray-50 transition-all group overflow-hidden bg-white">
                                        <div className="h-32 bg-gray-50 flex items-center justify-center border-b border-gray-100 group-hover:bg-blue-50/50 transition-colors">
                                            <HiDocumentText size={48} className="text-blue-400 opacity-60 group-hover:scale-110 transition-transform" />
                                        </div>
                                        <div className="p-3 flex items-center gap-2">
                                            <HiDocumentText className="text-blue-500 text-lg flex-shrink-0" />
                                            <span className="text-[12px] font-medium text-gray-600 truncate">{file.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </main>

            {/* Drop Indicator Overlay */}
            {isDragging && (
                <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-blue-500/10 backdrop-blur-[2px]">
                    <div className="bg-blue-600 text-white px-10 py-5 rounded-2xl shadow-2xl flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200">
                        <HiUpload size={40} />
                        <span className="font-bold text-lg uppercase tracking-widest">Drop Files</span>
                    </div>
                </div>
            )}
        </div>
    );
}