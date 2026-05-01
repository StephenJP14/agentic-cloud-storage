'use client'

import { categories } from "@/modules/products/data";
import { addProduct, deleteProduct, getProducts, NewProduct, Product, ProductFilter, ProductSegment, ProductType, updateProduct } from "@/services/product";
import { parseSpecString } from "@/utils/string";
import { useEffect, useState } from "react";
import UpdateProductModal from "./UpdateProductModal";

export default function ProductDashboard() {
    const [activeMenu, setActiveMenu] = useState<'data' | 'create'>('data')
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [products, setProducts] = useState<Product[] | null>(null)
    const [filter, setFilter] = useState<ProductFilter>({
        type: '',
        sort: 'price_desc'
    });
    const fetchProducts = async () => {
        const res = await getProducts(filter)
        setProducts(res.data.data)
    }
    const [productType, setProductType] = useState<ProductType>("laptop");
    const [productName, setProductName] = useState("");
    const [productSegment, setProductSegment] = useState<ProductSegment>("B2C");
    const [specifications, setSpecifications] = useState("");
    const [warrantyLength, setWarrantyLength] = useState<number>(1);
    const [price, setPrice] = useState<number>(0);
    const [headline, setHeadline] = useState("");
    const [subheadline, setSubheadline] = useState("");
    const [displayImage, setDisplayImage] = useState<File | undefined>(undefined);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [ecommerceUrl, setEcommerceUrl] = useState<string>("")
    const [shopeeUrl, setShopeeUrl] = useState("")
    const [tokopediaUrl, setTokopediaUrl] = useState("")

    // Gunakan useEffect untuk handle cleanup memory agar tidak memory leak
    useEffect(() => {
        if (!displayImage) {
            setPreviewUrl(null);
            return;
        }

        const objectUrl = URL.createObjectURL(displayImage);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [displayImage]);

    const handleSubmit = async () => {
        if (!displayImage) {
            alert("Please upload a product image");
            return;
        }

        const payload: Product = {
            product_type: productType,
            product_name: productName,
            product_segment: productSegment,
            specifications: specifications,
            warranty_length: warrantyLength,
            price: price,
            headline: headline,
            subheadline: subheadline,
            display_image: displayImage, // Masukkan file ke payload
            product_code: '',
            ecommerce_url: ecommerceUrl,
            shopee_url: shopeeUrl,
            tokopedia_url: tokopediaUrl
        };

        try {
            await addProduct(payload)
            alert('New product added!')

            // Reset form
            setProductName("")
            setSpecifications("")
            setPrice(0)
            setHeadline("")
            setSubheadline("")
            setDisplayImage(undefined) // Reset file input

            fetchProducts();
        } catch (error) {
            alert('Failed to add product')
        }
    };

    const handleDelete = async (productID: number) => {
        const isConfirmed = window.confirm("Confirm Delete Product?");
        if (!isConfirmed) return;

        try {
            await deleteProduct(productID)
            alert('Product deleted!')
            fetchProducts()
        } catch (error) {
            alert('Failed to delete product')
        }
    }

    const handleUpdate = async (updatedProduct: Product) => {
        try {
            // updatedProduct already contains the modal's values and optionally a File under display_image
            await updateProduct(updatedProduct)
            console.log("Updated Product:", updatedProduct)
            alert('Product updated!')
            setIsModalOpen(false)
            setSelectedProduct(null)
            fetchProducts()
        } catch (error) {
            alert('Failed to update product')
        }
    }

    const openUpdateModal = (product: Product) => {
        setSelectedProduct(product)
        setIsModalOpen(true)
    }

    const closeUpdateModal = () => {
        setIsModalOpen(false)
        setSelectedProduct(null)
    }

    useEffect(() => {
        fetchProducts()
    }, [])

    return (
        <>
            <div className="flex">
                <button
                    onClick={() => setActiveMenu('data')}
                    className={`py-2 px-8 border-b-2 hover:border-(--z-red) ${activeMenu == 'data' ? 'border-(--z-red) text-white bg-(--z-red) rounded-t-md' : 'border-gray-300'}`}
                >
                    Data
                </button>
                <button
                    onClick={() => setActiveMenu('create')}
                    className={`py-2 px-8 border-b-2 hover:border-(--z-red) ${activeMenu == 'create' ? 'border-(--z-red) text-white bg-(--z-red) rounded-t-md' : 'border-gray-300'}`}
                >
                    Create
                </button>
            </div>
            <section className="w-full h-[82vh] bg-white overflow-y-auto">
                {activeMenu === 'data' && (
                    <div className="w-full h-full overflow-y-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-gray-700 text-white sticky top-0 z-10 font-medium">
                                <tr>
                                    <th className="border-b p-3 text-left">ID</th>
                                    <th className="border-b p-3 text-left">Product Name</th>
                                    <th className="border-b p-3 text-left">Price</th>
                                    <th className="border-b p-3 text-left">Type</th>
                                    <th className="border-b p-3 text-left">Specifications</th>
                                    <th className="border-b p-3 text-left">Stock</th>
                                    <th className="border-b p-3 text-left">Warranty</th>
                                    <th className="border-b p-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products?.map((p, i) => (
                                    <tr
                                        key={p.ID}
                                        className="odd:bg-white even:bg-gray-100 hover:bg-gray-50 transition"
                                    >
                                        <td className="border border-gray-300 p-3">{p.ID}</td>
                                        <td className="border border-gray-300 p-3 font-medium">{p.product_name}</td>
                                        <td className="border border-gray-300 p-3">{p.price}</td>
                                        <td className="border border-gray-300 p-3">{p.product_type}</td>
                                        <td className="border border-gray-300 p-3 text-xs">
                                            <div className="flex flex-col gap-1">
                                                {parseSpecString(p.specifications).map((s, idx) => (
                                                    <span key={idx} className="text-gray-700">
                                                        • {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="border border-gray-300 p-3">{p.stock}</td>
                                        <td className="border border-gray-300 p-3">{p.warranty_length}</td>
                                        <td className="border border-gray-300 p-3">
                                            <button className="p-2 text-sm bg-red-200 text-red-800 rounded-full mr-2" onClick={() => handleDelete(p.ID!)}>Delete</button>
                                            <button className="p-2 text-sm bg-yellow-100 text-yellow-800 rounded-full" onClick={() => openUpdateModal(p)}>Update</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                )}
                {activeMenu === "create" && (
                    <div className="flex flex-col gap-4 bg-white p-6 rounded-md max-w-xl">

                        <h2 className="text-lg font-semibold">Add New Product</h2>

                        {/* UPLOAD IMAGE */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Display Image</label>

                            {/* Preview Box */}
                            {previewUrl ? (
                                <div className="relative w-full h-48 rounded-md border-2 border-dashed border-gray-300 overflow-hidden group">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-full object-contain bg-gray-50"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => setDisplayImage(undefined)}
                                            className="bg-white text-red-600 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm"
                                        >
                                            Remove & Replace
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setDisplayImage(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <span className="text-2xl">+</span>
                                        <span className="text-xs">Click to upload product image</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PRODUCT NAME */}
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Name</label>
                            <input
                                className="p-2 border border-gray-300 rounded-md"
                                type="text"
                                placeholder="Product name"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                required
                            />
                        </div>

                        {/* PRODUCT TYPE */}
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Type</label>
                            <select
                                className="p-2 border border-gray-300 rounded-md"
                                value={productType}
                                onChange={(e) => setProductType(e.target.value as ProductType)}
                            >
                                {categories.map((c) => (
                                    <option value={c.value} key={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* PRODUCT SEGMENT */}
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Segment</label>
                            <select
                                className="p-2 border border-gray-300 rounded-md"
                                value={productSegment}
                                onChange={(e) => setProductSegment(e.target.value as ProductSegment)}
                            >
                                <option value="B2C">B2C</option>
                                <option value="B2B">B2B</option>
                                <option value="B2G">B2G</option>
                            </select>
                        </div>

                        {/* WARRANTY */}
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Warranty Length (days)</label>
                            <input
                                className="p-2 border border-gray-300 rounded-md"
                                type="number"
                                min={0}
                                value={warrantyLength}
                                onChange={(e) => setWarrantyLength(Number(e.target.value))}
                            />
                        </div>


                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Price</label>
                            <input
                                className="p-2 border border-gray-300 rounded-md"
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">E-Commerce URL</label>
                            <input
                                className="p-2 border border-gray-300 rounded-md"
                                type="text"
                                placeholder="https://"
                                value={ecommerceUrl}
                                onChange={(e) => setEcommerceUrl(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Shopee URL</label>
                            <input
                                className="p-2 border border-gray-300 rounded-md"
                                type="text"
                                placeholder="https://"
                                value={shopeeUrl}
                                onChange={(e) => setShopeeUrl(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Tokopedia URL</label>
                            <input
                                className="p-2 border border-gray-300 rounded-md"
                                type="text"
                                placeholder="https://"
                                value={tokopediaUrl}
                                onChange={(e) => setTokopediaUrl(e.target.value)}
                            />
                        </div>

                        {/* SPECIFICATIONS */}
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Specifications (please seperate by '|' per spec)</label>
                            <textarea
                                className="p-2 border border-gray-300 rounded-md min-h-30"
                                placeholder="ex: Intel i7500 | SSD nVme 526 GB | DDR 8GB RAM"
                                value={specifications}
                                onChange={(e) => setSpecifications(e.target.value)}
                            />
                        </div>

                        {/* Headline */}
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Headline</label>
                            <textarea
                                className="p-2 border border-gray-300 rounded-md min-h-30"
                                placeholder="Headline"
                                value={headline}
                                onChange={(e) => setHeadline(e.target.value)}
                            />
                        </div>

                        {/* Subheadline */}
                        <div className="flex flex-col">
                            <label className="text-sm text-gray-400">Subheadline</label>
                            <textarea
                                className="p-2 border border-gray-300 rounded-md min-h-30"
                                placeholder="Subheadline"
                                value={subheadline}
                                onChange={(e) => setSubheadline(e.target.value)}
                            />
                        </div>

                        {/* SUBMIT */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleSubmit}
                                className="px-6 py-3 bg-(--z-red) hover:bg-(--z-red-dark) text-white rounded-md"
                            >
                                Save Product
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Update Product Modal */}
            <UpdateProductModal
                isOpen={isModalOpen}
                onClose={closeUpdateModal}
                product={selectedProduct}
                onUpdate={handleUpdate}
            />
        </>
    )
}