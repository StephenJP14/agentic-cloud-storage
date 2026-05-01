import BentoSummary from "@/modules/home/bento-summary";
import PartnersMarquee from "./partners-marquee";
import TestimonialCarousel from "./testimoni-carousel";
import ProductHighlight from "./product-highlight";
import ShiningButton from "@/components/shared/shining-button";

export function LandingPage() {
    return (
        <>
            <section className="w-full h-[90vh] md:h-[80vh] relative">
                <img src="/home-bg.svg" className="w-full object-cover absolute -z-10 opacity-30" />
                <div className="px-[6%] md:px-[14%] w-full h-full flex justify-between items-center">
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <h1 className="text-3xl md:text-4xl font-bold">Bangga Merek</h1>
                        <h1 className="text-5xl md:text-7xl font-bold bg-linear-to-r from-[#800808] to-red-500 text-transparent bg-clip-text">
                            INDONESIA
                        </h1>
                        <h1 className="md:text-2xl text-gray-500 pt-4 w-[90%] md:w-2/3">Solution for Businesses, Goverments, and Customers</h1>
                    </div>
                    <img src="/home-hero.webp" alt="Zyrex Laptop" className="absolute right-2 md:right-20 bottom-0 w-[90%] md:w-[50%]" />
                </div>
            </section>

            <section className="w-full h-[60vh] md:h-screen relative">
                <img src="/home-bg-2.svg" alt="" className="absolute w-full h-full -z-20 object-cover" />
                <div className="px-[6%] md:px-[14%] w-full h-full flex flex-col items-center gap-40 pt-[20vh]">
                    <h1 className="text-2xl md:text-3xl text-white text-center">Over <b>29 years of experience</b> in delivering reliable technology, supported by a nationwide service network across Indonesia.</h1>
                    <img src="/d-tech-pro.webp" alt="" className="absolute -bottom-52 md:w-1/2" />
                </div>
            </section>

            <PartnersMarquee />

            <BentoSummary />

            <ProductHighlight />

            <TestimonialCarousel />
        </>
    )
}