export interface DriveFile {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'image' | 'doc';
  owner: string;
  updatedAt: string;
  size?: string;
}

export const mockFiles: DriveFile[] = [
  { id: '1', name: 'Project Proposals', type: 'folder', owner: 'me', updatedAt: 'Jan 12, 2026' },
  { id: '2', name: 'Q4_Report.pdf', type: 'pdf', owner: 'me', updatedAt: 'Jan 20, 2026', size: '1.2 MB' },
  { id: '3', name: 'Profile_Picture.png', type: 'image', owner: 'me', updatedAt: 'Jan 15, 2026', size: '450 KB' },
  { id: '4', name: 'Budget_2026.doc', type: 'doc', owner: 'Sarah Lane', updatedAt: 'Jan 22, 2026', size: '85 KB' },
  { id: '5', name: 'Vacation Photos', type: 'folder', owner: 'me', updatedAt: 'Dec 05, 2025' },
];