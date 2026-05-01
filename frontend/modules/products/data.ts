import { ProductType } from "@/services/product";

type CategoryOption = {
    label: string;
    value: ProductType;
};

export const categories: CategoryOption[] = [
    { label: "All", value: "" },
    { label: "Laptop", value: "laptop" },
    { label: "AIO", value: "aio" },
    { label: "Desktop", value: "desktop" },
    { label: "Server", value: "server" },
    { label: "Display", value: "display" },
    { label: "Smart TV", value: "tv" },
    { label: "IOT and Accessories", value: "iot" },
]

export const sort = [
    {
        label: "Price: Low to High",
        value: "price_asc",
    },
    {
        label: "Price: High to Low",
        value: "price_desc",
    },
    {
        label: "Name: A - Z",
        value: "name_asc",
    },
    {
        label: "Name: Z - A",
        value: "name_desc",
    },
];