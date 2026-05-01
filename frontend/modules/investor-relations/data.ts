export const menu = [
    // { label: 'Press Release', state: 'siaran-pers' },
    { label: 'Financial Statement', state: 'laporan-keuangan' },
    { label: 'Annual Reports', state: 'laporan-tahunan' },
    // { label: 'Analyst Meeting', state: 'pertemuan-analis' },
    { label: 'Prospectus', state: 'prospektus' },
    { label: 'RUPS', state: 'rups' },
    // { label: 'Information Disclosure', state: 'keterbukaan-informasi' },
    // { label: 'Equity Research', state: 'penelitian-ekuitas' },
    // { label: 'Public Expose', state: 'paparan-publik' },
]

export const contentMap: any = {
    "siaran-pers": {
        title: "Siaran Pers",
        desc: "Informasi resmi dan pengumuman terbaru dari Zyrex kepada publik dan pemangku kepentingan.",
    },
    "laporan-keuangan": {
        title: "Financial Statement",
        desc: "Laporan keuangan Zyrex disajikan secara berkala untuk memberikan gambaran kinerja perusahaan secara transparan dan akuntabel.",
    },
    "laporan-tahunan": {
        title: "Annual Reports",
        desc: "Ringkasan kinerja, strategi bisnis, dan pencapaian perusahaan selama satu tahun buku.",
    },
    "pertemuan-analis": {
        title: "Analyst Meeting",
        desc: "Paparan manajemen kepada analis dan investor mengenai kinerja, strategi, dan prospek bisnis perusahaan.",
    },
    "prospektus": {
        title: "Prospectus",
        desc: "Dokumen resmi yang memuat informasi lengkap mengenai perusahaan untuk kepentingan penawaran umum dan investor.",
    },
    "rups": {
        title: "General Meeting of Shareholders",
        desc: "Informasi dan hasil keputusan Rapat Umum Pemegang Saham sebagai bentuk transparansi kepada pemegang saham.",
    },
    "keterbukaan-informasi": {
        title: "Information Disclosure",
        desc: "Penyampaian informasi penting dan material sesuai dengan ketentuan regulator dan prinsip tata kelola perusahaan.",
    },
    "penelitian-ekuitas": {
        title: "Equity Research",
        desc: "Laporan dan analisis dari pihak independen mengenai kinerja dan valuasi saham perusahaan.",
    },
    "paparan-publik": {
        title: "Public Expose",
        desc: "Presentasi manajemen kepada publik mengenai kondisi perusahaan, strategi bisnis, dan perkembangan terbaru.",
    },
}

export const managementTeam = {
    directors: [
        { name: 'Timothy Sidik, Shu', title: 'Direktur Utama' },
        { name: 'Antoni', title: 'Direktur' },
        { name: 'Nursam', title: 'Direktur' },
        { name: 'Colleen Sidik, Shu', title: 'Direktur' },
    ],
    commissioners: [
        { name: 'Widya Kumala Sulistyo', title: 'President Commissioner' },
        { name: 'Wijaya Subekti', title: 'Independent Commissioner' },
    ],
    audit: [
        { name: 'Wijaya Subekti', title: 'Ketua' },
        { name: 'Tony', title: 'Anggota' },
    ],
    internalAudit: [
        { name: 'Suriyono', title: 'Internal Auditor' },
    ],
    corsec: [
        { name: 'Evan Jordan', title: 'Corporate Secretary' },
    ],
}