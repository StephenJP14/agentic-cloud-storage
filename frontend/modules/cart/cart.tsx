"use client";

import { useEffect, useMemo, useState } from "react";
import ShiningButton from "@/components/shared/shining-button";
import { formatRupiah } from "@/utils/number";
import { getCart, saveCart } from "@/utils/cart";

type CartItem = {
    id: string;
    name: string;
    price: number;
    qty: number;
    image?: string;
};

export default function Cart() {
    const [cart, setCart] = useState<CartItem[]>(() => {
        const stored = getCart();
        return stored ?? [];
    });

    useEffect(() => {
        saveCart(cart)
    }, [cart]);

    const totalPrice = useMemo(() => {
        return cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    }, [cart]);

    const increaseQty = (id: string) => {
        setCart((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, qty: item.qty + 1 } : item
            )
        );
    };

    const decreaseQty = (id: string) => {
        setCart((prev) =>
            prev
                .map((item) =>
                    item.id === id
                        ? { ...item, qty: item.qty - 1 }
                        : item
                )
                .filter((item) => item.qty > 0)
        );
    };

    return (
        <>
            <section className="px-4 sm:px-[6%] md:px-[10%] lg:px-[14%] w-full py-24 md:py-32 flex flex-col lg:flex-row justify-center gap-8 lg:gap-12 relative">

                {/* Cart List */}
                <div className="w-full flex-1">
                    <h1 className="text-lg font-semibold">Your Cart</h1>

                    <div className="w-full mt-4">
                        {cart.length === 0 && (
                            <p className="text-gray-400">
                                Your cart is empty. See products{" "}
                                <a href="/products" className="underline">here.</a>
                            </p>
                        )}

                        <div className="flex flex-col gap-4">
                            {cart.map((item, i) => (
                                <div
                                    key={i}
                                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200"
                                >
                                    {/* Left */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <img
                                            src={item.image || "/products/dtechpro/display-1.png"}
                                            alt={item.name}
                                            className="w-24 sm:w-28 md:w-32 object-contain mx-auto sm:mx-0"
                                        />

                                        <div className="flex-1">
                                            <p className="text-base md:text-lg font-semibold">
                                                {item.name}
                                            </p>

                                            <p className="text-base md:text-lg font-bold">
                                                {formatRupiah(item.price)}
                                            </p>

                                            {/* Qty control */}
                                            <div className="flex items-center gap-3 mt-2">
                                                <button
                                                    className="w-8 h-8 border rounded"
                                                    onClick={() => decreaseQty(item.id)}
                                                >
                                                    -
                                                </button>
                                                <span className="font-semibold">{item.qty}</span>
                                                <button
                                                    className="w-8 h-8 border rounded"
                                                    onClick={() => increaseQty(item.id)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right */}
                                    <div className="flex justify-between sm:justify-end items-center">
                                        <p className="font-semibold">
                                            Total: {formatRupiah(item.price * item.qty)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="w-full lg:w-90 shrink-0 h-fit p-4 rounded-md border border-gray-300 lg:sticky lg:top-32">
                    <p className="text-lg font-semibold">Cart Summary</p>

                    <p className="text-lg mt-2 mb-6">
                        Total Price:{" "}
                        <span className="font-bold">{formatRupiah(totalPrice)}</span>
                    </p>

                    <ShiningButton disabled={true} bg='disabled'>
                        Checkout
                    </ShiningButton>

                    <p className="mt-12">or find us here:</p>
                    <div className="flex">
                        <a
                            className="p-4 w-full h-16 flex items-center justify-center"
                            href="https://www.tokopedia.com/zyrex"
                        >
                            <img src="/tokopedia.png" alt="Tokopedia" className="w-auto h-full" />
                        </a>
                        <a
                            className="p-4 w-full h-16 flex items-center justify-center"
                            href="https://shopee.co.id/zyrex.id?entryPoint=ShopBySearch&searchKeyword=zyrex"
                        >
                            <img src="/shopee.svg" alt="Tokopedia" className="w-auto h-full" />
                        </a>
                    </div>
                </div>

            </section>

        </>
    );
}
