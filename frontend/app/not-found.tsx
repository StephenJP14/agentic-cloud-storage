export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
            <div className="text-center">
                {/* Visual 404 */}
                <div className="relative">
                    <h1 className="text-[12rem] font-black text-gray-200 select-none">
                        404
                    </h1>
                    <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-gray-800 w-full">
                        Oops! Page not found
                    </p>
                </div>

                {/* Description */}
                <div className="max-w-md mx-auto -mt-8">
                    <p className="text-gray-500 mb-8">
                        The page you are looking for is unavailable.
                    </p>
                </div>

                {/* Decorative Element */}
                <div className="mt-16 flex justify-center gap-4 opacity-20">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                </div>
            </div>
        </div>
    )
}