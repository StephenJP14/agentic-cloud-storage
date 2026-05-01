export type CartItem = {
    id: string;
    name: string;
    price: number;
    qty: number;
    image?: string;
};

const CART_KEY = "zyrex_cart";

// 🔹 Get cart from localStorage
export function getCart(): CartItem[] {
    if (typeof window === "undefined") return [];

    const stored = localStorage.getItem(CART_KEY);
    if (!stored) return [];

    try {
        return JSON.parse(stored);
    } catch {
        return [];
    }
}

// 🔹 Save cart to localStorage
export function saveCart(cart: CartItem[]) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// 🔹 Add item to cart
export function addToCart(item: Omit<CartItem, "qty">, qty: number = 1) {
    const cart = getCart();

    const index = cart.findIndex((i) => i.id === item.id);

    if (index !== -1) {
        // Already exists → increase qty
        cart[index].qty += qty;
    } else {
        cart.push({
            ...item,
            qty,
        });
    }

    saveCart(cart);
}

// 🔹 Remove item
export function removeFromCart(id: string) {
    const cart = getCart().filter((i) => i.id !== id);
    saveCart(cart);
}

// 🔹 Update qty
export function updateCartQty(id: string, qty: number) {
    const cart = getCart().map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, qty) } : item
    );

    saveCart(cart);
}

// 🔹 Clear cart
export function clearCart() {
    localStorage.removeItem(CART_KEY);
}

// 🔹 Get total items count (sum of qty)
export function getCartLength(): number {
    const cart = getCart();
    return cart.reduce((total, item) => total + item.qty, 0);
}
