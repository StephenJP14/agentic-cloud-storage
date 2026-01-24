'use client'
import { useState, useRef, useEffect } from 'react';

interface Props {
    initialFile?: File | null;
    onComplete?: () => void;
}

export default function FileUploader({ initialFile, onComplete }: Props) {
    const [file, setFile] = useState<File | null>(initialFile || null); const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialFile) setFile(initialFile);
    }, [initialFile]);

    // Handle drag events
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation(); // Add this
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const [isUploading, setIsUploading] = useState(false);

    const uploadFile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setIsUploading(true);

        // 1. Create FormData to match FastAPI's expectations
        const formData = new FormData();
        formData.append('file', file); // The key 'file' must match the backend parameter name

        try {
            console.log("Starting upload to FastAPI...");

            // 2. Make the API call
            const response = await fetch('http://localhost:8000/upload/', {
                method: 'POST',
                body: formData,
                // Note: Don't set 'Content-Type' header manually; 
                // the browser sets it to 'multipart/form-data' automatically with the boundary
            });

            if (!response.ok) {
                throw new Error(`Upload failed with status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Success:", data);

            alert(`Successfully uploaded ${data.filename} to MinIO!`);

            if (onComplete) onComplete();
        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload file. Check if the backend is running.");
        } finally {
            setIsUploading(false);
        }
    };

    const removeFile = () => {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className='flex flex-col items-center justify-center w-full min-h-screen p-4'>
            <div className='w-120 bg-white p-8 rounded-xl shadow-sm border border-gray-200'>
                <h2 className='text-xl font-bold mb-4 text-gray-800'>Upload Document</h2>

                <form
                    onSubmit={uploadFile}
                    onDragEnter={handleDrag}
                    className='flex flex-col gap-4'
                >
                    <label
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-all
                            ${dragActive
                                ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                            }`}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <div className={`mb-3 p-3 rounded-full ${dragActive ? 'bg-blue-100' : 'bg-gray-200'}`}>
                                📁
                            </div>
                            <p className="mb-2 text-sm text-gray-500 font-semibold">
                                {dragActive ? "Drop it here!" : "Click or drag to upload"}
                            </p>
                            <p className="text-xs text-gray-400">PDF, PNG, or JPG (MAX. 5MB)</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.png,.jpg,.jpeg"
                        />
                    </label>

                    {file && (
                        <div className='flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-1'>
                            <div className='flex flex-col overflow-hidden'>
                                <span className='text-sm font-medium text-blue-900 truncate'>{file.name}</span>
                                <span className='text-xs text-blue-700'>{(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                            <button
                                type="button"
                                onClick={removeFile}
                                className='text-blue-900 hover:bg-blue-200 p-1 rounded-full transition-colors'
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={!file || isUploading}
                        className={`w-full py-2.5 rounded-md font-semibold transition-all ${file && !isUploading
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {isUploading ? "Uploading..." : "Upload to Server"}
                    </button>
                </form>
            </div>
        </div>
    );
}