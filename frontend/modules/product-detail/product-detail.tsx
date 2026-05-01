'use client'

import BentoSummary from "@/modules/home/bento-summary";
import ShiningButton from "@/components/shared/shining-button";
import { FaShoppingCart } from "react-icons/fa";
import PortImage from "./port-img";
import { Product } from "@/services/product";
import { parseSpecString, toFlatString } from "@/utils/string";
import { MdOutlineEmail } from 'react-icons/md'
export interface ProductDetailProp {
    product: Product
}

export default function ProductDetail({ product }: ProductDetailProp) {
    if (!product) return <div className="w-full h-screen flex justify-center items-center">Product not found</div>

    return (
        <>
            {/* <img src="/products/dtechpro/banner-dtechpro.png" alt="Zyrex D-TECH PRO" className="w-full" /> */}

            <section className="w-full grid grid-cols-1 gap-24 md:grid-cols-2 py-24 pl-[6%] md:pl-[14%]">
                <div className="flex flex-col justify-center gap-6 md:p-24 mt-24 md:mt-0">
                    <h1 className="uppercase font-bold text-gray-600 text-xl">{product.product_name}</h1>
                    <h2 className="text-2xl font-semibold bg-linear-to-r from-[#E8592A] to-[#912A7F] bg-clip-text text-transparent">{product.headline}</h2>
                    <p>{product.subheadline}</p>
                    {(product.product_segment == 'B2G' || product.product_segment == 'B2B') ? (
                        <ShiningButton w="w-52" bg="red">
                            <><MdOutlineEmail size={20} /> Contact Sales</>
                        </ShiningButton>
                    ) : (
                        <ShiningButton w="w-52">
                            <><FaShoppingCart size={20} /> Buy Now</>
                        </ShiningButton>
                    )}
                </div>
                <div className="flex justify-end items-center">
                    <img src={`/products/${toFlatString(product.product_code)}/banner-3-${toFlatString(product.product_code)}.png`} alt="" className="w-full" />
                </div>
                <div className="flex justify-end items-center">
                    <img src="/products/dtechpro/banner-2-dtechpro.png" alt="" className="w-full" />
                </div>
            </section>

            <section className="px-[6%] md:px-[14%] mb-40 md:mb-80 flex flex-col gap-12 items-center pb-[32vh] md:pb-[40vh] w-full relative bg-linear-to-r from-[#331E35] via-[#3F3265] to-[#13143D]">
                <div className="text-center mt-20">
                    <h4 className="text-white text-xl mb-4">SPECIFICATIONS</h4>
                    <h2 className="text-white text-3xl font-semibold">Built to support your productivity</h2>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    {parseSpecString(product.specifications).map((s, i) => (
                        <div key={i} className="p-2 text-sm md:text-lg md:p-4 rounded-md bg-[rgb(255,255,255,0.05)] border border-white/20 text-white">{s}</div>
                    ))}
                </div>
                <img
                    src={`/products/${toFlatString(product.product_code)}/banner-4-${toFlatString(product.product_code)}.png`}
                    alt="Zyrex D-Tech Pro"
                    className="w-auto md:h-[72vh] absolute -bottom-40 md:-bottom-80" />
            </section>

            {/* <section className="w-full flex justify-center items-center text-xl text-center py-24">
                <p className="w-2/3 text-xl">{desc[toFlatString(product.product_code)]?.subheadline2}</p>
            </section> */}

            <PortImage productCode={toFlatString(product.product_code)} />

            {/* <img src="/products/dtechpro/banner-1-dtechpro.png" alt="Zyrex D-TECH PRO" className="w-full" /> */}

            <BentoSummary />

            {/* <section className="px-[6%] md:px-[14%] py-24 w-full">
                <h2 className="text-2xl font-semibold mb-12">Similar Product</h2>
                <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-12">
                    <img src="/similar-dtech.png" alt="Zyrex D-Tech Laptop" className="md:w-2/3" />
                    <div className="md:w-120 flex flex-col gap-6 md:gap-12 justify-between">
                        <div>
                            <h4 className="text-xl">Zyrex D-Tech</h4>
                            <b className="text-2xl">Rp3.000.000</b>
                        </div>
                        <div>
                            <p>
                                AMD Ryzen 5 6600H <br />
                                16GB DDR5 <br />
                                SSD 512GB NVME (Upgradeable) <br />
                                14" FHD Resolution 1920 x 1200 IPS <br />
                            </p>
                            <div className="flex gap-2 mt-6">
                                <div className="py-2 px-4 rounded-full border border-gray-300 flex gap-2 items-center justify-center">
                                    <div className="bg-[#414B76] w-6 h-6 rounded-full"></div>
                                    <p>Blue</p>
                                </div>
                                <div className="py-2 px-4 rounded-full border border-gray-300 flex gap-2 items-center justify-center">
                                    <div className="bg-[#FF5A3D] w-6 h-6 rounded-full"></div>
                                    <p>Rose Gold</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button className="p-4 border border-gray-300 rounded-md">Learn more</button>
                            <ShiningButton><><FaShoppingCart size={20} /> Add to Cart</></ShiningButton>
                        </div>
                    </div>
                </div>
            </section> */}
        </>
    )
}