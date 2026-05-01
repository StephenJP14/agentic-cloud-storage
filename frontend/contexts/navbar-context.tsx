"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type NavVariants = "a" | "b";

type NavStyleContextType = {
    variant: NavVariants;
    setVariant: (v: NavVariants) => void;
};

const NavStyleContext = createContext<NavStyleContextType | undefined>(undefined);

export function NavStyleProvider({ children }: { children: ReactNode }) {
    const [variant, setVariant] = useState<NavVariants>("a");

    return (
        <NavStyleContext.Provider value={{ variant, setVariant }}>
            {children}
        </NavStyleContext.Provider>
    );
}

export function useNavStyle() {
    const ctx = useContext(NavStyleContext);
    if (!ctx) {
        throw new Error("useNavStyle must be used inside NavStyleProvider");
    }
    return ctx;
}
