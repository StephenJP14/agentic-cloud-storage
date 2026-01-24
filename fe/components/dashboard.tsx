'use client'
import { useState, useRef } from 'react';
import { mockFiles, DriveFile } from './data';
import FileUploader from './file-uploader';

export default function Dashboard() {
    const [files] = useState<DriveFile[]>(mockFiles);
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [droppedFile, setDroppedFile] = useState<File | null>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setDroppedFile(e.dataTransfer.files[0]);
            setIsUploaderOpen(true);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'folder': return '📂';
            case 'pdf': return '📕';
            case 'image': return '🖼️';
            default: return '📄';
        }
    };

    return (
        <div
            className="flex h-screen bg-white font-sans text-gray-700 relative"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {/* Drag Overlay HUD */}
            {dragActive && (
                <div className="absolute inset-0 z-50 bg-blue-600/10 border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
                    <div className="bg-white px-8 py-4 rounded-full shadow-2xl text-blue-600 font-bold text-xl">
                        Drop files to upload to My Drive
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className="w-64 flex flex-col p-4 border-r border-gray-200">
                <div className="flex items-center gap-2 px-2 mb-8">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">Δ</div>
                    <span className="text-xl font-medium text-gray-900">Drive</span>
                </div>

                <button
                    onClick={() => { setDroppedFile(null); setIsUploaderOpen(true); }}
                    className="w-full flex items-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow mb-6 text-sm font-medium"
                >
                    <span className="text-2xl text-blue-600">+</span> New
                </button>

                <nav className="flex flex-col gap-1">
                    {['My Drive', 'Computers', 'Shared with me', 'Recent', 'Starred', 'Trash'].map((item, i) => (
                        <div key={item} className={`px-4 py-2 rounded-full text-sm cursor-pointer ${i === 0 ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'}`}>
                            {item}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 border-b border-gray-200 flex items-center px-6 justify-between">
                    <div className="flex-1 max-w-2xl">
                        <input type="text" placeholder="Search in Drive" className="w-full bg-gray-100 rounded-full px-6 py-2 outline-none focus:bg-white focus:ring-1 focus:ring-gray-300 transition-all" />
                    </div>
                </header>

                <div className="p-6 overflow-y-auto">
                    <h2 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Files</h2>
                    <div className="w-full">
                        <div className="grid grid-cols-4 px-4 py-2 border-b border-gray-200 text-xs font-bold text-gray-500">
                            <div>Name</div>
                            <div>Owner</div>
                            <div>Last modified</div>
                            <div>Size</div>
                        </div>
                        {files.map(file => (
                            <div key={file.id} className="grid grid-cols-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer text-sm items-center">
                                <div className="flex items-center gap-3 truncate">
                                    <span>{getIcon(file.type)}</span>
                                    <span className="text-gray-900 font-medium">{file.name}</span>
                                </div>
                                <div className="text-gray-600">{file.owner === 'me' ? 'me' : file.owner}</div>
                                <div className="text-gray-500">{file.updatedAt}</div>
                                <div className="text-gray-500">{file.size || '--'}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {isUploaderOpen && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
                    onClick={() => setIsUploaderOpen(false)} // Close when clicking background
                >
                    <div onClick={(e) => e.stopPropagation()}> {/* Prevents closing when clicking uploader */}
                        <FileUploader
                            initialFile={droppedFile}
                            onComplete={() => {
                                setIsUploaderOpen(false);
                                setDroppedFile(null);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}