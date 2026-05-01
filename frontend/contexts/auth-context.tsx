"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/services/user";
import { signout } from "@/services/auth";

type AuthContextType = {
    user: User | null;
    isAuthenticated: boolean;
    saveUser: (userData: User) => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const isAuthenticated = !!user;

    useEffect(() => {
        const savedUser = localStorage.getItem("auth_user");
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                localStorage.removeItem("auth_user");
            }
        }
        setLoading(false);
    }, []);

    const saveUser = (userData: User) => {
        setUser(userData);
        localStorage.setItem("auth_user", JSON.stringify(userData));
    };

    const logout = async () => {
        await signout()
        setUser(null);
        localStorage.removeItem("auth_user");
        router.push("/dashboard/login");
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                saveUser,
                logout,
            }}
        >
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return ctx;
}