import { NewsCategory } from "@/services/news";

type CategoryOption = {
    label: string;
    value: "" | NewsCategory;
};

export const categories: CategoryOption[] = [
    { label: "All", value: "" },
    { label: "Article", value: "artikel" },
    { label: "Audience", value: "audiensi" },
    { label: "CSR", value: "csr" },
    { label: "News", value: "news" },
    { label: "Uncategorized", value: "uncategorized" },
];
