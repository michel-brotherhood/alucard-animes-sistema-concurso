import { CATEGORIES, DEFAULT_JURORS, CATEGORIES_WITHOUT_SCORES, KPOP_CATEGORIES } from "./cosplay-types";
import type { Inscrito, Nota } from "./cosplay-types";

export const catIndex = (c: string) => CATEGORIES.indexOf(c.toUpperCase() as any);

export const byOrder = (a: Inscrito, b: Inscrito) => {
  const ai = catIndex(a.categoria);
  const bi = catIndex(b.categoria);
  if (ai !== bi) return ai - bi;
  return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
};

export function clampNota(n: string | number | null | undefined): number | null {
  let x = parseFloat((n || "").toString().replace(",", "."));
  if (isNaN(x)) return null;
  x = Math.round(x * 2) / 2;
  return Math.max(0, Math.min(10, x));
}

export function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function desvio(a: number[]): number {
  const m = a.reduce((p, c) => p + c, 0) / a.length;
  const v = a.map(x => (x - m) ** 2).reduce((p, c) => p + c, 0) / a.length;
  return Math.sqrt(v);
}

export function getJurorScores(nota: Nota | undefined): number[] {
  if (!nota) return [];
  return [nota.jurado_1, nota.jurado_2, nota.jurado_3].filter(x => typeof x === "number") as number[];
}

export function calculateMedia(scores: number[]): number | null {
  if (!scores.length) return null;
  return +(scores.reduce((p, c) => p + c, 0) / scores.length).toFixed(2);
}

export function shouldShowInDashboard(categoria: string): boolean {
  return categoria !== "ANIMEKÊ" && !KPOP_CATEGORIES.includes(categoria as any);
}

export function shouldShowInAvaliacao(categoria: string): boolean {
  return categoria !== "ANIMEKÊ" && !KPOP_CATEGORIES.includes(categoria as any);
}

export function shouldGroupIntoDesfileLivre(
  categoria: string,
  inscritos: Inscrito[]
): boolean {
  const categoriasParaAgrupar = ["GEEK", "GAME", "ANIME"];
  if (!categoriasParaAgrupar.includes(categoria)) return false;
  
  const count = inscritos.filter(p => p.categoria === categoria).length;
  return count < 3;
}

export function groupSmallCategories(inscritos: Inscrito[]): Inscrito[] {
  const categoriasParaAgrupar = ["GEEK", "GAME", "ANIME"];
  const inscritosAgrupados: Inscrito[] = [];
  const inscritosDesfileLivre = inscritos.filter(p => p.categoria === "DESFILE LIVRE");

  for (const cat of CATEGORIES) {
    if (categoriasParaAgrupar.includes(cat)) {
      const participantesDaCategoria = inscritos.filter(p => p.categoria === cat);
      if (participantesDaCategoria.length < 3) {
        inscritosDesfileLivre.push(
          ...participantesDaCategoria.map(p => ({ ...p, categoria: "DESFILE LIVRE" }))
        );
      } else {
        inscritosAgrupados.push(...participantesDaCategoria);
      }
    } else if (cat !== "DESFILE LIVRE") {
      inscritosAgrupados.push(...inscritos.filter(p => p.categoria === cat));
    }
  }
  
  inscritosAgrupados.push(...inscritosDesfileLivre);
  return inscritosAgrupados;
}
