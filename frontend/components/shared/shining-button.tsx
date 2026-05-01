import React from "react";

type ShiningButtonProps = {
    children: React.ReactNode
    onClick?: React.MouseEventHandler<HTMLButtonElement>
    w?: string,
    bg?: 'blue' | 'red' | 'solidRed' | 'disabled'
    disabled?: boolean
}

export default function ShiningButton({ children, onClick, w, bg = 'blue', disabled = false }: ShiningButtonProps) {
    // if (disabled) return;

    const btnBg = {
        red: 'bg-linear-to-t from-(--z-red-dark) via-(--z-red) to-(--z-red-light)',
        solidRed: 'bg-(--z-red)',
        blue: 'bg-linear-to-b from-[#6CBDFF] to-[#0064B7]',
        disabled: 'bg-gray-400 text-gray-700'
    }

    return (
        <button
            onClick={onClick}
            className={`group relative overflow-hidden ${w ? w : 'w-full'} p-3 ${btnBg[bg]} text-white rounded-md flex justify-center items-center gap-2 cursor-pointer`}
            disabled={disabled}
        >
            <div
                className="
                    pointer-events-none
                    absolute
                    -left-1/2
                    top-[-50%]
                    w-16
                    h-[200%]
                    rotate-20
                    bg-linear-to-r
                    from-transparent
                    via-white
                    to-transparent
                    opacity-50
                    transition-all
                    duration-700
                    group-hover:left-[120%]
                "
            />
            {children}
        </button>
    )
}