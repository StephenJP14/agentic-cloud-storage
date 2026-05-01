"use client"

import SquareRadio from "@/components/shared/square-radio";
import { categories, sort } from "./data";
import { useEffect, useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import { FaSearch, FaShoppingCart } from "react-icons/fa";
import { formatRupiah } from "@/utils/number";
import ShiningButton from "@/components/shared/shining-button";
import ProductHighlight from "../home/product-highlight";
import BentoSummary from "@/modules/home/bento-summary";
import { parseSpecString, toFlatString } from "@/utils/string";
import { useSearchParams, useRouter } from "next/navigation";
import { useNavStyle } from "@/contexts/navbar-context";
import { addToCart } from "@/utils/cart";
import { getProducts, Product, ProductFilter, ProductType } from "@/services/product";
import { MdOutlineEmail } from 'react-icons/md'
import ProductDetailModal from "./detail-modal";

export default function Shop() {
    const { setVariant } = useNavStyle()
    const router = useRouter();
    const [products, setProducts] = useState<Product[] | null>(null);
    const searchParams = useSearchParams();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [openFilter, setOpenFilter] = useState({
        category: true,
        sort: true,
    })

    const [filter, setFilter] = useState<ProductFilter>({
        type: searchParams.get('type') || '',
        sort: (searchParams.get('sort') as any) || ''
    });

    useEffect(() => {
        const params = new URLSearchParams();
        if (filter.type) params.set('type', filter.type);
        if (filter.sort) params.set('sort', filter.sort);

        router.push(`?${params.toString()}`, { scroll: false });

        console.log(filter)
        fetchProducts(filter);
    }, [filter]);

    const fetchProducts = async (currentFilter: ProductFilter) => {
        try {
            const res = await getProducts(currentFilter);
            setProducts(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCategoryChange = (val: string) => {
        const currentType = val as ProductType;
        let selectedTypes = filter.type ? filter.type.split(',') : [];

        if (currentType === '') {
            setFilter(prev => ({ ...prev, type: '' }));
            return;
        }

        // Hapus "" (All) jika ada
        selectedTypes = selectedTypes.filter(t => t !== '');

        if (selectedTypes.includes(currentType)) {
            selectedTypes = selectedTypes.filter(t => t !== currentType);
        } else {
            selectedTypes.push(currentType);
        }

        setFilter(prev => ({
            ...prev,
            type: selectedTypes.join(',')
        }));
    };

    const handleSortChange = (val: string) => {
        setFilter(prev => ({
            ...prev,
            sort: (prev.sort === val ? "" : val) as ProductFilter['sort']
        }));
    };

    const isCategoryChecked = (val: string) => {
        if (val === '') return filter.type === '';
        return filter.type.split(',').includes(val);
    };

    useEffect(() => {
        setVariant('b')
    }, [setVariant]);

    const handleOpenModal = (p: Product) => {
        setSelectedProduct(p);
        setIsModalOpen(true);
    };

    return (
        <>
            <ProductHighlight led={false} />
            <section className="px-[6%] md:px-[14%] relative mt-4 w-full py-12 flex flex-col md:flex-row justify-center gap-12">
                {/* Sidebar Filter */}
                <aside className="hidden md:flex flex-col gap-4 sticky top-28 h-fit">
                    <p className="text-lg font-semibold">Filter</p>
                    <div className="flex flex-col border border-gray-300 rounded-md">
                        <div className="border-b border-gray-400 pb-4">
                            <div
                                className="px-4 pt-4 flex w-64 justify-between cursor-pointer select-none"
                                onClick={() => setOpenFilter((s) => ({ ...s, category: !s.category }))}
                            >
                                <b>Category</b>
                                {openFilter.category ? <FaChevronUp /> : <FaChevronDown />}
                            </div>
                            {openFilter.category && (
                                <div className="p-4 pl-6 flex flex-col gap-4">
                                    {categories.map((c) => (
                                        <SquareRadio
                                            key={c.value}
                                            label={c.label}
                                            value={c.value}
                                            // Gunakan helper function tadi
                                            checked={isCategoryChecked(c.value)}
                                            onChange={handleCategoryChange}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Sort Filter */}
                        <div className="border-b border-gray-400 pb-4">
                            <div
                                className="px-4 pt-4 flex w-64 justify-between cursor-pointer select-none"
                                onClick={() => setOpenFilter((s) => ({ ...s, sort: !s.sort }))}
                            >
                                <b>Sort By</b>
                                {openFilter.sort ? <FaChevronUp /> : <FaChevronDown />}
                            </div>
                            {openFilter.sort && (
                                <div className="p-4 pl-6 flex flex-col gap-4">
                                    {sort.map((s) => (
                                        <SquareRadio
                                            key={s.value}
                                            label={s.label}
                                            value={s.value}
                                            // Sekarang lebih simpel karena value sort sama persis dengan state
                                            checked={filter.sort === s.value}
                                            onChange={handleSortChange}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                <div className="w-full">
                    <p className="mt-6 text-gray-500">Showing {products?.length || 0} products</p>

                    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        {(!products || products.length === 0) && <p>No Data Available.</p>}

                        {products?.map((p, i) => (
                            <div
                                key={i}
                                className="p-4 w-full h-auto flex flex-col justify-between gap-3 rounded-md border border-white hover:border-gray-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
                            >
                                {p.display_image != null ? (
                                    <img
                                        src={`data:image/png;base64,${p.display_image}`}
                                        alt={p.product_name}
                                        className="w-75.5 h-51.5 object-contain rounded-md"
                                    />
                                ) : (
                                    <img
                                        src={`/products/${toFlatString(p.product_code)}/display-1.png`}
                                        alt={p.product_name}
                                        className="w-75.5 h-51.5 object-contain rounded-md"
                                    />
                                )}
                                <div>
                                    <div className="mb-4">
                                        <p className="text-lg font-semibold">{p.product_name}</p>
                                        {p.price != 0 && (
                                            <p className="text-lg font-bold">{formatRupiah(p.price)}</p>
                                        )}
                                    </div>
                                    <ul className="text-sm text-gray-600 flex flex-col gap-1">
                                        {parseSpecString(p.specifications).slice(0, 5).map((s, idx) => (
                                            <li key={idx}>- {s}</li>
                                        ))}
                                        <li>and more...</li>
                                    </ul>
                                </div>

                                <div className="mt-4 flex flex-col gap-2">
                                    {(p.product_segment === 'B2G' || p.product_segment === 'B2B') ? (
                                        <>
                                            <button
                                                onClick={() => handleOpenModal(p)}
                                                className="w-full p-3 border border-gray-300 hover:border-red-600 hover:text-red-600 rounded-md flex justify-center items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
                                            >
                                                Learn more
                                            </button>
                                            <ShiningButton
                                                bg="red"
                                                onClick={() => {
                                                    window.location.href = "mailto:sales@zyrex.com";
                                                }}
                                            >
                                                <MdOutlineEmail size={20} /> Contact Sales
                                            </ShiningButton>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm">Available at:</p>
                                            <div className="flex">
                                                <a
                                                    target="_blank"
                                                    className="p-4 w-full h-16 flex items-center justify-center"
                                                    href={p.tokopedia_url != '' ? p.tokopedia_url : `https://www.tokopedia.com/zyrex`}
                                                >
                                                    <img src="/tokopedia.webp" alt="Tokopedia" className="w-auto h-full" />
                                                </a>
                                                <a
                                                    target="_blank"
                                                    className="p-4 w-full h-16 flex items-center justify-center"
                                                    href={p.shopee_url != '' ? p.shopee_url : `https://shopee.co.id/zyrex.id?entryPoint=ShopBySearch&searchKeyword=zyrex`}
                                                >
                                                    <img src="/shopee.svg" alt="Shopee" className="w-auto h-full" />
                                                </a>
                                            </div>
                                            <a href={`/products/${p.ID}`} className="w-full p-3 border border-gray-300 hover:border-red-600 hover:text-red-600 rounded-md flex justify-center items-center gap-2 hover:bg-gray-50">
                                                Learn more
                                            </a>
                                            {/* <ShiningButton
                                                bg="red"
                                                onClick={
                                                    () => {
                                                        addToCart({
                                                            id: toFlatString(p.product_code),
                                                            name: p.product_name,
                                                            price: p.price,
                                                            image: `/products/${toFlatString(p.product_code)}/display-1.png`,
                                                        })
                                                        alert('Added to Cart!')
                                                    }}
                                            >
                                                <FaShoppingCart size={20} /> Add To Cart
                                            </ShiningButton> */}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            <BentoSummary />

            {
                isModalOpen && (
                    <ProductDetailModal
                        product={selectedProduct}
                        onClose={() => setIsModalOpen(false)}
                    />
                )
            }
        </>
    )
}