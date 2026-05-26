export interface MenuItem {
  id: string;
  slug: string;
  name: string;
  available: boolean;
  fit: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface MenuResponse {
  proteins: MenuItem[];
  sides: MenuItem[];
}

