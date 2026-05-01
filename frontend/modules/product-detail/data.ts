export type ProductCode =
    | "lbook"
    | "ultra"
    | "blaze"
    | "dtech"
    | "dtechpro"
    | "orion";

export type ProductDescription = {
    headline: string;
    subheadline: string;
    subheadline2: string;
};

export const desc: any = {
    lbook: {
        headline: "Built for Everyday Essentials",
        subheadline:
            "A reliable and affordable laptop designed for daily tasks, online learning, and office work with smooth and efficient performance.",
        subheadline2:
            "Everything you need to stay productive every day, without unnecessary complexity."
    },

    ultra: {
        headline: "Faster, Smarter, More Productive",
        subheadline:
            "Designed to deliver a more responsive experience with a sharper display and balanced performance for all-day productivity.",
        subheadline2:
            "A smart choice for those who want more speed and comfort in their daily workflow."
    },

    blaze: {
        headline: "Power for Serious Work",
        subheadline:
            "Equipped with high-performance hardware to handle heavy multitasking, content creation, and demanding professional workloads.",
        subheadline2:
            "Built to keep up with your most demanding projects, without slowing you down."
    },

    dtech: {
        headline: "Perfect Balance for Work and Play",
        subheadline:
            "A versatile laptop that blends performance, comfort, and modern design for both productivity and everyday entertainment.",
        subheadline2:
            "The ideal balance for users who want one device for everything they do."
    },

    dtechpro: {
        headline: "One Laptop for Every Challenge",
        subheadline:
            "Built for creative professionals and modern multitaskers who demand powerful performance in a clean, minimalist design.",
        subheadline2:
            "A true professional tool designed to move as fast as your ideas."
    },

    aioorion: {
        headline: "The All-in-One Solution for Modern Workspaces",
        subheadline:
            "A clean, space-saving All-in-One PC that keeps your desk organized while delivering everything you need for work and business.",
        subheadline2:
            "A simple, elegant solution for a more efficient and professional workspace."
    }
};
