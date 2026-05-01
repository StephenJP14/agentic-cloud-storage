export default function BentoSummary() {
    return (
        <section className="px-[6%] md:px-[14%] py-20 md:py-28 w-full flex flex-col items-center gap-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-center">
                Designed Around Your Needs
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-6xl">
                {/* Card 1 */}
                <a href="/products" className="relative bg-gray-100 rounded-2xl p-6 md:p-10 h-70 md:h-90 overflow-hidden">
                    <div className="relative z-10 max-w-[70%]">
                        <h3 className="text-lg md:text-xl lg:text-2xl font-semibold">
                            Everyday Productivity
                        </h3>
                        <p className="mt-2 text-sm md:text-base text-gray-700">
                            Run multiple apps, join online classes, and finish daily reports smoothly without slowing down.
                        </p>
                    </div>
                    <img
                        src="/productivity.webp"
                        alt=""
                        className="absolute right-0 bottom-0 w-[65%] max-w-105 object-contain pointer-events-none"
                    />
                </a>

                {/* Card 2 */}
                <a href="/products" className="relative bg-gray-100 rounded-2xl p-6 md:p-10 h-70 md:h-90 overflow-hidden">
                    <div className="relative z-10 max-w-[70%]">
                        <h3 className="text-lg md:text-xl lg:text-2xl font-semibold">
                            Built for Modern Work
                        </h3>
                        <p className="mt-2 text-sm md:text-base text-gray-700">
                            Enjoy a comfortable experience and balanced performance for both work and entertainment.
                        </p>
                    </div>
                    <img
                        src="/design.webp"
                        alt=""
                        className="absolute right-0 bottom-0 w-[65%] max-w-105 object-contain pointer-events-none"
                    />
                </a>

                {/* Card 3 */}
                <a href="/service-center" className="relative bg-gray-100 rounded-2xl p-6 md:p-10 h-75 md:h-90 md:col-span-2 overflow-hidden">
                    <div className="relative z-10 max-w-[60%]">
                        <h3 className="text-lg md:text-xl lg:text-2xl font-semibold">
                            Support & Service
                        </h3>
                        <p className="mt-2 text-sm md:text-base text-gray-700">
                            From technical support to spare parts, help is always within reach.
                        </p>
                    </div>
                    <img
                        src="/service-center.svg"
                        alt=""
                        className="absolute right-0 bottom-0 w-[55%] max-w-130 object-contain pointer-events-none"
                    />
                </a>
            </div>
        </section>
    )
}
