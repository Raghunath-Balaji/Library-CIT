export type BookStatus = 'on_shelf' | 'borrowed' | 'in_returns_cart';

export interface Book {
  id: string; // e.g. LIB1:CS01-1
  title: string;
  author: string;
  category: string;
  shelfId: string;
  row: number;
  status: BookStatus;
  description?: string;
  unavailableUntil?: string; // e.g. "Dec 08, 2026"
}

export interface BookInput {
  title: string;
  author: string;
  category: string;
  shelfId: string;
  row: number;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  shelfId: string;
  aisle?: string;
  description?: string;
}

export interface ShelfItem {
  id: string;
  type: 'shelf' | 'wall' | 'special' | 'desk';
  shelfId?: string;
  category?: string;
  aisle?: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rot?: number;
  facing?: 'north' | 'south' | 'east' | 'west';
  title: string;
  color?: string;
  maxBooks?: number;
}

export interface LayoutConfig {
  version: number;
  maxShelves: number;
  maxBooksPerShelf: number;
  floor: {
    id: string;
    w: number;
    d: number;
  };
  entrance: {
    x: number;
    z: number;
  };
  items: ShelfItem[];
}
