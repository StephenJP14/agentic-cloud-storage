import { FaCheck } from "react-icons/fa6";

export default function SquareRadio({ label, name, value, checked, onChange }: any) {
    return (
        <label className="flex items-center gap-3 cursor-pointer">
            <input
                type="checkbox"
                name={name}
                value={value}
                checked={checked}
                onChange={() => onChange(value)}
                className="hidden peer"
            />
            <div
                className="w-6 h-6 p-1 border-2 border-gray-400 rounded-sm flex items-center justify-center
                   peer-checked:border-(--z-red) peer-checked:bg-(--z-red) transition"
            >
                <FaCheck color="white" size={24} />
            </div>
            <span>{label}</span>
        </label>
    )
}
