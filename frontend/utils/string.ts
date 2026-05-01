export function toFlatString(str: string) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

export function parseSpecString(input: string): string[] {
    if (!input) return [];

    return input
        .split("|")
        .map(s => s.trim())
        .filter(s => {
            if (!s) return false;

            if (/^[-–—]+$/.test(s)) return false;

            return true;
        });
}

export function formatDate(dateStr: string) {
    const date = new Date(dateStr);

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(date);
}

export function toTitleCase(str: string) {
    return str
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export const generateTicketID = (branchId: string) => {
    const randomUint = Math.floor(10000 + Math.random() * 90000);
    return `ZMB/${branchId}/${randomUint}`;
};

export const getTodayDate = () => {
    return new Date().toISOString();
};