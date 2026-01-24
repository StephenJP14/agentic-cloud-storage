'use client'
import { useState, useRef, useEffect } from 'react';
import { mockFiles, DriveFile } from './data';
import FileUploader from './file-uploader';
import Chat from './chat';

export default function Dashboard() {
    const [files, setFiles] = useState<DriveFile[]>(mockFiles);
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [droppedFile, setDroppedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false); // New state

    const fetchFiles = async () => {
        try {
            const response = await fetch('http://localhost:8000/files/');
            const data = await response.json();

            // Map MinIO data to your DriveFile interface
            const formattedFiles = data.files.map((f: any) => ({
                id: f.name, // Using name as ID for now
                name: f.name,
                type: f.name.split('.').pop() === 'pdf' ? 'pdf' : 'doc', // Simple logic
                owner: 'me',
                updatedAt: new Date(f.last_modified).toLocaleDateString(),
                size: `${(f.size / 1024).toFixed(1)} KB`
            }));

            setFiles(formattedFiles);
        } catch (error) {
            console.error("Failed to fetch files:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

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
            className="flex h-screen bg-white font-sans text-gray-700 relative overflow-hidden"
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

            {/* 2. Main Content (The middle section) */}
            <main className="flex-1 flex flex-col min-w-0 border-r border-gray-200">
                <header className="h-16 border-b border-gray-200 flex items-center px-6 justify-between gap-4">
                    <div className="flex-1 max-w-2xl">
                        <input type="text" placeholder="Search in Drive" className="w-full bg-gray-100 rounded-full px-6 py-2 outline-none focus:bg-white focus:ring-1 focus:ring-gray-300 transition-all" />
                    </div>

                    {/* Chat Toggle Button */}
                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`py-2 px-4 rounded-full transition-colors ${isChatOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                        title="Chat with your files"
                    >
                        Chat 💬
                    </button>
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

            {/* 3. The New Chat Component */}
            <Chat
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                fileCount={files.length}
            />

            {/* Modal for FileUploader */}
            {isUploaderOpen && (
                <div
                    className="fixed w-full inset-0 z-[60] flex items-center justify-center bg-black/40"
                    onClick={() => setIsUploaderOpen(false)} // Close when clicking background
                >
                    <div className='' onClick={(e) => e.stopPropagation()}> {/* Prevents closing when clicking uploader */}
                        <FileUploader
                            initialFile={droppedFile}
                            onComplete={() => {
                                setIsUploaderOpen(false);
                                setDroppedFile(null);
                                fetchFiles();
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}