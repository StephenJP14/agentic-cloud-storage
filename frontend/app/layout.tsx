import Navbar from "@/components/shared/navbar"
import "./globals.css"
import type {Metadata} from "next"
import {Poppins} from "next/font/google"
import {NavStyleProvider} from "@/contexts/navbar-context"
import Footer from "@/components/shared/footer"
import {Toaster} from 'react-hot-toast';
import {AuthProvider} from "@/contexts/auth-context"
import Script from "next/script"

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-poppins",
})

export const metadata: Metadata = {
    metadataBase: new URL("https://www.zyrex.com"),

    title: {
        default: "Zyrex Indonesia | Laptop, PC, dan Solusi Teknologi Lokal",
        template: "%s | Zyrex Indonesia",
    },

    description:
        "Zyrex adalah brand teknologi Indonesia yang memproduksi laptop, PC, dan solusi IT untuk bisnis, pendidikan, dan pemerintahan. Produk lokal berkualitas, bergaransi resmi.",

    keywords: [
        "Zyrex",
        "Zyrex Indonesia",
        "Laptop Zyrex",
        "Laptop Indonesia",
        "PC Rakitan",
        "Mini PC",
        "All in One PC",
        "Laptop Bisnis",
        "Laptop Sekolah",
        "Laptop Pemerintah",
        "Produk TKDN",
        "Brand Lokal Indonesia",
        "Komputer Indonesia",
        "Zyrex Laptop Harga",
    ],

    authors: [{name: "Zyrex Indonesia"}],
    creator: "Zyrex Indonesia",
    publisher: "Zyrex Indonesia",

    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
        },
    },

    alternates: {
        canonical: "https://www.zyrex.com",
    },

    openGraph: {
        type: "website",
        locale: "id_ID",
        url: "https://www.zyrex.com",
        siteName: "Zyrex Indonesia",
        title: "Zyrex Indonesia | Laptop, PC, dan Solusi Teknologi Lokal",
        description:
            "Zyrex adalah brand teknologi Indonesia yang memproduksi laptop, PC, dan solusi IT untuk bisnis, pendidikan, dan pemerintahan.",
        images: [
            {
                url: "/og-image.jpg", // <-- WAJIB BUAT (1200x630)
                width: 1200,
                height: 630,
                alt: "Zyrex Indonesia",
            },
        ],
    },

    twitter: {
        card: "summary_large_image",
        title: "Zyrex Indonesia | Laptop, PC, dan Solusi Teknologi Lokal",
        description:
            "Brand teknologi Indonesia untuk laptop, PC, dan solusi IT bisnis, pendidikan, dan pemerintahan.",
        images: ["/og-image.jpg"],
    },

    category: "technology",
};


export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="id">
        <body className={`${poppins.variable} antialiased`}>

        {/* Google Tag Manager */}
        <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
                __html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-WV9RFLX3');
        `,
            }}
        />

        {/* GTM noscript (must be immediately after opening body) */}
        <noscript>
            <iframe
                src="https://www.googletagmanager.com/ns.html?id=GTM-WV9RFLX3"
                height="0"
                width="0"
                style={{display: "none", visibility: "hidden"}}
            />
        </noscript>
        <AuthProvider>
            <NavStyleProvider>
                <Navbar/>
                {children}
                <Toaster position="top-center" reverseOrder={false}/>
                <Footer/>
            </NavStyleProvider>
        </AuthProvider>
        </body>
        </html>
    )
}
