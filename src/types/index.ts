export interface Bottle {
  id: string;
  name: string;
  category: BottleCategory;
  quantity: number;
  minThreshold: number;
  price: number;
  supplierId: string;
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BottleCategory =
  | 'whisky'
  | 'rhum'
  | 'vodka'
  | 'gin'
  | 'cognac'
  | 'tequila'
  | 'vin_rouge'
  | 'vin_blanc'
  | 'vin_rose'
  | 'champagne'
  | 'biere'
  | 'liqueur'
  | 'autre';

export const CATEGORY_LABELS: Record<BottleCategory, string> = {
  whisky: 'Whisky',
  rhum: 'Rhum',
  vodka: 'Vodka',
  gin: 'Gin',
  cognac: 'Cognac',
  tequila: 'Tequila',
  vin_rouge: 'Vin Rouge',
  vin_blanc: 'Vin Blanc',
  vin_rose: 'Vin Rosé',
  champagne: 'Champagne',
  biere: 'Bière',
  liqueur: 'Liqueur',
  autre: 'Autre',
};

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  restaurantId: string;
}

export interface Restaurant {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
}

export interface User {
  uid: string;
  email: string;
  restaurantId: string;
  restaurantName: string;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Inventory: undefined;
  Restock: undefined;
  Suppliers: undefined;
};

export type InventoryStackParamList = {
  InventoryList: undefined;
  AddBottle: { supplierId?: string };
  EditBottle: { bottle: Bottle };
};
