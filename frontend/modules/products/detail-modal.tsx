import ShiningButton from "@/components/shared/shining-button";
import { Product } from "@/services/product";
import { parseSpecString } from "@/utils/string";
import { IoClose } from "react-icons/io5";
import { MdOutlineEmail } from "react-icons/md";

interface ProductDetailModalProp {
    product: Product | null;
    onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: ProductDetailModalProp) {
    if (!product) return null;

    return (
        <div
            className="fixed inset-0 z-100 bg-black/70 flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl relative overflow-y-auto p-8"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <IoClose size={24} />
                </button>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="flex flex-col items-center">
                        <img
                            src={`/products/${product.product_code?.toLowerCase()}/display-1.png`}
                            alt={product.product_name}
                            className="w-full object-contain rounded-md"
                        />
                    </div>
                    <div className="flex flex-col gap-8">
                        <h2 className="text-3xl font-bold">{product.product_name}</h2>
                        <div>
                            <p className="md:text-lg font-semibold mb-1">{product.headline}</p>
                            <p className="text-gray-600">{product.subheadline}</p>
                        </div>
                        <div className="mb-4">
                            <p className="font-semibold mb-2">Specifications:</p>
                            <ul className="text-sm text-gray-600 flex flex-col gap-1">
                                {parseSpecString(product.specifications).map((s, idx) => (
                                    <li key={idx}>- {s}</li>
                                ))}
                            </ul>
                        </div>
                        <ShiningButton
                            bg="red"
                            onClick={() => {
                                window.location.href = "mailto:sales@zyrex.com";
                            }}
                        >
                            <MdOutlineEmail size={20} /> Contact Sales
                        </ShiningButton>
                    </div>
                </div>
            </div>
        </div>
    );
}