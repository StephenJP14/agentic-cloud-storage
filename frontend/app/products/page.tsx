import Shop from "@/modules/products/shop";
import { Suspense } from "react";

export default function ProductsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Shop />
        </Suspense>
    )
}