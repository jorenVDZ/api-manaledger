export interface WantsListItem {
  scryfallId: string;
  amount: number;
  specificPrinting?: boolean;
  foil?: boolean;
}

export interface WantsList {
  id: string;
  userId: string;
  name: string;
  items: WantsListItem[];
  createdAt: string;
  updatedAt: string;
}
