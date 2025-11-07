export const CATEGORIES = [
  "COSPOBRE",
  "INFANTIL",
  "GEEK",
  "GAME",
  "ANIME",
  "DESFILE LIVRE",
  "APRESENTAÇÃO SOLO OU GRUPO",
  "ANIMEKÊ",
  "K-POP SOLO",
  "K-POP GRUPO"
] as const;

export const DEFAULT_JURORS = [
  "Jurado(a) 1",
  "Jurado(a) 2",
  "Jurado(a) 3"
] as const;

export const CATEGORIES_WITHOUT_SCORES = [
  "COSPOBRE",
  "INFANTIL",
  "ANIMEKÊ"
] as const;

export const KPOP_CATEGORIES = ["K-POP SOLO", "K-POP GRUPO"] as const;

export type Category = typeof CATEGORIES[number];

export interface Inscrito {
  id: string;
  nome: string;
  categoria: string;
  cosplay: string;
  created: number;
  created_at?: string;
}

export interface Nota {
  id: string;
  jurado_1?: number | null;
  jurado_2?: number | null;
  jurado_3?: number | null;
  updated_at?: string;
}

export interface RankingItem {
  it: Inscrito;
  media: number;
  med: number;
  desv: number;
}
