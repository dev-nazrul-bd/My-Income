export interface ProductType {
  id: string;
  name: string;
  value: number; // Taka per piece
}

export interface BigRecord {
  id: string;
  date: string;
  productTypeId: string;
  piece: number;
  price: number; // Calculated dynamically or stored: piece * productType.value
  photoUrl: string;
}

export interface SmallRecord {
  id: string;
  date: string;
  paidTaka: number;
}

export interface Profile {
  name: string;
  avatarUrl: string;
}

export interface AppState {
  currentSeason: string;
  seasons: string[];
  photoQualityKB: number; // Default 50
  profile: Profile;
  productTypes: ProductType[];
  notepad: string;
}
