"use client";

const partners = [
    "/partners/alfamart.webp",
    "/partners/bni.webp",
    "/partners/bnsp.webp",
    "/partners/btn.webp",
    "/partners/indomaret.webp",
    "/partners/kkp.webp",
    "/partners/kominfo.webp",
    "/partners/kpk.webp",
    "/partners/mandiri.webp",
    "/partners/rscm.webp",
];

export default function PartnersMarquee() {
    return (
        <section className="mt-[40vh] mb-[12vh] md:mb-[16vh] w-full flex flex-col justify-center items-center">
            <h1 className="text-2xl md:text-3xl font-semibold text-center">Trusted by Leading Partners</h1>
            <div className="relative overflow-hidden w-full mt-12">
                <div className="flex w-max animate-marquee gap-2 md:gap-12">
                    {/* render 2x biar infinite */}
                    {[...partners, ...partners].map((src, i) => (
                        <img
                            key={i}
                            src={src}
                            alt="Partner"
                            className="h-24 md:h-40 w-auto object-contain hover:opacity-100 transition"
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
