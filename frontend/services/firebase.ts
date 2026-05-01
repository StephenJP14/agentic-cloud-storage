'use client';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const storage = getStorage(app);

export { storage };

export const uploadToFirebase = async (file: File, folder: string = "landing"): Promise<string> => {
    if (!file) throw new Error("No file provided");

    try {
        // Sanitize filename and add timestamp
        const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
        const fileName = `${Date.now()}-${safeName}`;
        const storageRef = ref(storage, `${folder}/${fileName}`);

        // metadata helps Firebase identify the file type in the dashboard
        const metadata = {
            contentType: file.type,
        };

        const snapshot = await uploadBytes(storageRef, file, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error("Firebase Upload Error:", error);
        throw error;
    }
};

export const deleteFromFirebase = async (fileUrl: string): Promise<void> => {
    if (!fileUrl) return;

    try {
        // ref(storage, fileUrl) otomatis mengenali path jika dikirimkan URL full Firebase
        const fileRef = ref(storage, fileUrl);
        await deleteObject(fileRef);
    } catch (error) {
        console.error("Firebase Delete Error:", error);
        throw new Error("Gagal menghapus gambar dari server.");
    }
};