/** Mostra uma data do banco (AAAA-MM-DD) no formato brasileiro (DD/MM/AAAA). */
export function formatarData(data: string | null | undefined): string {
  if (!data) return '—';

// Qual era o problema?
// O banco retorna a data no formato padrão AAAA-MM-DD.
// Ao usar new Date(data) no frontend, a data sofria conversão
// de fuso horário e podia aparecer um dia antes.
// A solução foi formatar a string diretamente para DD/MM/AAAA,
// sem fazer a conversão para Date.

  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Mostra um valor em reais. */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Primeiro dia de um mês no formato do banco (AAAA-MM-01). mesIndice segue o JavaScript: janeiro = 0. */
export function primeiroDiaDoMes(ano: number, mesIndice: number): string {
  const d = new Date(ano, mesIndice, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
