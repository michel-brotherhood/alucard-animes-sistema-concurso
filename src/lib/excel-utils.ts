import * as XLSX from 'xlsx';
import type { Inscrito } from './cosplay-types';

export interface ExcelRow {
  nome: string;
  categoria: string;
  cosplay: string;
}

export function readExcelFile(file: File): Promise<ExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
        
        const rows: ExcelRow[] = jsonData.map((row: any) => ({
          nome: String(row.nome || row.Nome || row.NOME || '').trim(),
          categoria: String(row.categoria || row.Categoria || row.CATEGORIA || '').trim().toUpperCase(),
          cosplay: String(row.cosplay || row.Cosplay || row.COSPLAY || row.personagem || row.Personagem || '').trim()
        })).filter(row => row.nome && row.categoria && row.cosplay);
        
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsBinaryString(file);
  });
}

export function exportRankingToExcel(rankings: { categoria: string; ganhadores: any[] }[]) {
  const data: any[] = [];
  
  rankings.forEach(({ categoria, ganhadores }) => {
    ganhadores.forEach((ganhador, index) => {
      data.push({
        'Posição': index + 1,
        'Categoria': categoria,
        'Nome': ganhador.it.nome,
        'Personagem/Cosplay': ganhador.it.cosplay,
        'Média': ganhador.media.toFixed(2),
        'Mediana': ganhador.med.toFixed(2),
        'Desvio Padrão': ganhador.desv.toFixed(2)
      });
    });
    
    // Adiciona linha em branco entre categorias
    data.push({});
  });
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rankings');
  
  // Ajusta largura das colunas
  worksheet['!cols'] = [
    { wch: 10 },  // Posição
    { wch: 30 },  // Categoria
    { wch: 30 },  // Nome
    { wch: 35 },  // Personagem
    { wch: 10 },  // Média
    { wch: 10 },  // Mediana
    { wch: 15 }   // Desvio
  ];
  
  XLSX.writeFile(workbook, `ranking_ganhadores_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function downloadExcelTemplate() {
  const template = [
    { nome: 'João Silva', categoria: 'ANIME', cosplay: 'Naruto Uzumaki' },
    { nome: 'Maria Santos', categoria: 'GAME', cosplay: 'Lara Croft' },
    { nome: 'Pedro Costa', categoria: 'GEEK', cosplay: 'Spider-Man' }
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Participantes');
  
  // Ajusta largura das colunas
  worksheet['!cols'] = [
    { wch: 30 },  // nome
    { wch: 30 },  // categoria
    { wch: 35 }   // cosplay
  ];
  
  XLSX.writeFile(workbook, 'template_inscritos.xlsx');
}
