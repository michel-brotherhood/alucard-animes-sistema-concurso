import { jsPDF } from "jspdf";
import "jspdf-autotable";
import type { Inscrito, Nota, RankingItem } from "./cosplay-types";
import { byOrder, groupSmallCategories, shouldShowInDashboard, getJurorScores, median, desvio } from "./cosplay-utils";
import { CATEGORIES, CATEGORIES_WITHOUT_SCORES } from "./cosplay-types";

export async function exportPdfApresentacao(inscritos: Inscrito[], logoUrl: string) {
  const doc = new jsPDF();
  
  const filteredInscritos = inscritos.filter(it => shouldShowInDashboard(it.categoria));
  const groupedInscritos = groupSmallCategories(filteredInscritos);
  const sortedInscritos = [...groupedInscritos].sort(byOrder);

  if (!sortedInscritos.length) {
    alert("Nenhum participante para exportar");
    return;
  }

  // Add logo
  const img = new Image();
  img.src = logoUrl;
  await new Promise((resolve) => {
    img.onload = resolve;
  });
  doc.addImage(img, 'PNG', 10, 10, 30, 30);

  // Title
  doc.setFontSize(20);
  doc.text("Concurso de Cosplay - Lista de Apresentação", 45, 25);

  // Table data
  const tableData: any[] = [];
  let idx = 1;
  let lastCat: string | null = null;

  for (const it of sortedInscritos) {
    if (it.categoria !== lastCat) {
      lastCat = it.categoria;
      tableData.push([
        {
          content: lastCat,
          colSpan: 3,
          styles: { fontStyle: 'bold', fillColor: [255, 215, 0] }
        }
      ]);
    }
    tableData.push([idx++, it.nome, it.cosplay]);
  }

  // Generate table
  (doc as any).autoTable({
    head: [['#', 'Nome', 'Personagem/Cosplay']],
    body: tableData,
    startY: 50,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [255, 215, 0] }
  });

  doc.save('apresentacao-cosplay.pdf');
}

export async function exportRankingPdf(inscritos: Inscrito[], notas: Record<string, Nota>, logoUrl: string) {
  const doc = new jsPDF();
  
  const filteredInscritos = inscritos.filter(it => shouldShowInDashboard(it.categoria));
  const groupedInscritos = groupSmallCategories(filteredInscritos);
  const sortedInscritos = [...groupedInscritos].sort(byOrder);

  const porCat: Record<string, Inscrito[]> = {};
  for (const it of sortedInscritos) {
    (porCat[it.categoria] = porCat[it.categoria] || []).push(it);
  }

  // Add logo
  const img = new Image();
  img.src = logoUrl;
  await new Promise((resolve) => {
    img.onload = resolve;
  });
  doc.addImage(img, 'PNG', 10, 10, 30, 30);

  doc.setFontSize(22);
  doc.setTextColor(255, 215, 0);
  doc.text('Ranking do Concurso de Cosplay', 45, 25);
  doc.setFontSize(12);
  doc.setTextColor(150, 150, 150);
  doc.text('Gerado em: ' + new Date().toLocaleDateString(), 45, 32);

  let finalY = 50;

  for (const cat of CATEGORIES) {
    if (CATEGORIES_WITHOUT_SCORES.includes(cat as any)) continue;
    
    const itemsForCat = porCat[cat] || [];
    if (cat !== "DESFILE LIVRE" && itemsForCat.length < 3) continue;
    if (!itemsForCat.length) continue;

    const items: RankingItem[] = itemsForCat
      .map((it) => {
        const scores = getJurorScores(notas[it.id]);
        if (!scores.length) return null;

        return {
          it,
          media: +(scores.reduce((p, c) => p + c, 0) / scores.length).toFixed(2),
          med: median(scores),
          desv: desvio(scores),
        };
      })
      .filter((x): x is RankingItem => x !== null)
      .sort((a, b) => {
        if (b.media !== a.media) return b.media - a.media;
        if (b.med !== a.med) return b.med - a.med;
        if (a.desv !== b.desv) return a.desv - b.desv;
        return a.it.created - b.it.created;
      });

    if (items.length === 0) continue;

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(`Categoria: ${cat}`, 14, finalY + 10);
    finalY += 20;

    const tableColumn = ["Posição", "Nome", "Cosplay", "Média"];
    const tableRows: any[] = [];

    let pos = 1;
    for (const x of items) {
      tableRows.push([pos, x.it.nome, x.it.cosplay, x.media]);
      pos++;
    }

    (doc as any).autoTable(tableColumn, tableRows, {
      startY: finalY,
      headStyles: { fillColor: [42, 42, 42], textColor: [255, 215, 0], fontStyle: 'bold' },
      bodyStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [33, 33, 33] },
      margin: { top: 5, left: 10, right: 10, bottom: 10 },
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 },
        3: { cellWidth: 30, halign: 'center' }
      },
      didDrawPage: function (data: any) {
        let str = 'Página ' + (doc as any).internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(str, data.settings.margin.left, (doc as any).internal.pageSize.height - 10);
      }
    });
    finalY = (doc as any).autoTable.previous.finalY + 10;
  }

  doc.save('ranking_cosplay.pdf');
}

export function generateRankingPDF(rankings: { categoria: string; ganhadores: RankingItem[] }[]) {
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.setTextColor(255, 215, 0);
  doc.text('Ganhadores do Concurso de Cosplay', 14, 20);
  doc.setFontSize(12);
  doc.setTextColor(150, 150, 150);
  doc.text('Gerado em: ' + new Date().toLocaleDateString('pt-BR'), 14, 28);

  let finalY = 40;

  for (const { categoria, ganhadores } of rankings) {
    if (ganhadores.length === 0) continue;

    // Check if we need a new page
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(`Categoria: ${categoria}`, 14, finalY);
    finalY += 10;

    const tableColumn = ["Posição", "Nome", "Personagem/Cosplay", "Média", "Mediana", "Desvio"];
    const tableRows: any[] = [];

    ganhadores.forEach((ganhador, index) => {
      tableRows.push([
        index + 1,
        ganhador.it.nome,
        ganhador.it.cosplay,
        ganhador.media.toFixed(2),
        ganhador.med.toFixed(2),
        ganhador.desv.toFixed(2)
      ]);
    });

    (doc as any).autoTable(tableColumn, tableRows, {
      startY: finalY,
      headStyles: { fillColor: [42, 42, 42], textColor: [255, 215, 0], fontStyle: 'bold' },
      bodyStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [33, 33, 33] },
      margin: { top: 5, left: 10, right: 10, bottom: 10 },
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 50 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' }
      },
      didDrawPage: function (data: any) {
        let str = 'Página ' + (doc as any).internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(str, data.settings.margin.left, (doc as any).internal.pageSize.height - 10);
      }
    });
    finalY = (doc as any).autoTable.previous.finalY + 15;
  }

  doc.save(`ganhadores_cosplay_${new Date().toISOString().split('T')[0]}.pdf`);
}
