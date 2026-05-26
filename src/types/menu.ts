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

export interface MealTypeItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  emoji: string;
  required_proteins: number;
  required_sides: number;
  available: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface MenuResponse {
  mealTypes: MealTypeItem[];
  proteins: MenuItem[];
  sides: MenuItem[];
}
