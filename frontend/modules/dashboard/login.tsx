"use client"

import { useAuth } from "@/contexts/auth-context";
import { login } from "@/services/auth";
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login() {
    const { saveUser } = useAuth()
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false);

    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        setError("")

        if (!username || !password) {
            setError("Username and password are required.")
            return
        }

        try {
            setLoading(true)

            const res = await login({
                username,
                password
            })
            saveUser(res.data.data.user)

            window.location.href = "/dashboard";
        } catch (err: any) {
            setError(err.message || "Login failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="w-full py-32 flex items-center justify-center">
            <div className="w-full max-w-md bg-white p-8">
                {/* Title */}
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-semibold">Dashboard Login</h1>
                </div>

                {/* Form */}
                <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-400">
                            Username
                        </label>
                        <input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-(--z-red)"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-400">
                            Password
                        </label>

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-(--z-red)"
                            />

                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    {/* Error message (no layout change) */}
                    {error && (
                        <div className="text-sm text-red-500 mt-2">
                            {error}
                        </div>
                    )}

                    <button
                        disabled={loading}
                        type="submit"
                        className="mt-6 bg-(--z-red) text-white py-3 rounded-md font-semibold hover:opacity-90 transition disabled:opacity-60"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>
            </div>
        </section>
    )
}
