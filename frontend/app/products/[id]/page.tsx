import ProductDetail from "@/modules/product-detail/product-detail";
import { getProductByID } from "@/services/product";
import { notFound } from "next/navigation";

export default async function ProductDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    try {
        const response = await getProductByID(Number(id));
        const productData = response.data.data;

        if (!productData) {
            return notFound();
        }

        return <ProductDetail product={productData} />;

    } catch (error) {
        console.error("Error fetching product SSR:", error);
        return notFound();
    }
}