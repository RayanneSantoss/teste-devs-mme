import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatarMoeda, primeiroDiaDoMes } from '../lib/formatadores';

const tamanhoPagina = 1000;
const nomeMeses = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

type Venda = {
  data_venda: string;
  valor: number;
  status: string;
  closer_id: number | null;
  closer: { id: number; nome: string } | null;
};

type Meta = { vendedor_id: number; ano: number; mes: number; meta_vendas: number };
type Closer = { id: number; nome: string };
type LinhaRelatorio = {
  mes: string;
  closerId: number;
  closerNome: string;
  vendas: number;
  canceladas: number;
  vgv: number;
  meta: number | null;
};

function dataLocal(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

async function buscarVendas(inicio: string, fim: string): Promise<Venda[]> {
  const resultado: Venda[] = [];
  for (let deslocamento = 0; ; deslocamento += tamanhoPagina) {
    const { data, error } = await supabase
      .from('vendas')
      .select('data_venda, valor, status, closer_id, closer:vendedores!vendas_closer_id_fkey(id, nome)')
      .gte('data_venda', inicio)
      .lte('data_venda', fim)
      .order('data_venda', { ascending: true })
      .order('id', { ascending: true })
      .range(deslocamento, deslocamento + tamanhoPagina - 1);
    if (error) throw error;
    const pagina = (data ?? []) as unknown as Venda[];
    resultado.push(...pagina);
    if (pagina.length < tamanhoPagina) return resultado;
  }
}

async function buscarMetas(anoInicial: number, anoFinal: number): Promise<Meta[]> {
  const resultado: Meta[] = [];
  for (let deslocamento = 0; ; deslocamento += tamanhoPagina) {
    const { data, error } = await supabase
      .from('metas')
      .select('vendedor_id, ano, mes, meta_vendas')
      .gte('ano', anoInicial)
      .lte('ano', anoFinal)
      .order('ano', { ascending: true })
      .order('mes', { ascending: true })
      .order('vendedor_id', { ascending: true })
      .range(deslocamento, deslocamento + tamanhoPagina - 1);
    if (error) throw error;
    const pagina = (data ?? []) as Meta[];
    resultado.push(...pagina);
    if (pagina.length < tamanhoPagina) return resultado;
  }
}

async function buscarClosers(): Promise<Closer[]> {
  const { data, error } = await supabase
    .from('vendedores')
    .select('id, nome')
    .eq('funcao', 'closer')
    .order('nome');
  if (error) throw error;
  return data ?? [];
}

function mesesNoPeriodo(inicio: string, fim: string): string[] {
  const [anoInicial, mesInicial] = inicio.split('-').map(Number);
  const [anoFinal, mesFinal] = fim.split('-').map(Number);
  const meses: string[] = [];
  for (let ano = anoInicial; ano <= anoFinal; ano += 1) {
    const primeiroMes = ano === anoInicial ? mesInicial : 1;
    const ultimoMes = ano === anoFinal ? mesFinal : 12;
    for (let mes = primeiroMes; mes <= ultimoMes; mes += 1) {
      meses.push(`${ano}-${String(mes).padStart(2, '0')}`);
    }
  }
  return meses;
}

function percentual(valor: number): string {
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
}

function rotuloDoMes(mes: string): string {
  const [ano, numeroMes] = mes.split('-');
  return `${nomeMeses[Number(numeroMes) - 1]} de ${ano}`;
}

function mensagemDoErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

export function Relatorio() {
  const hoje = new Date();
  const [inicio, setInicio] = useState(primeiroDiaDoMes(hoje.getFullYear(), hoje.getMonth()));
  const [fim, setFim] = useState(dataLocal(hoje));
  const [linhas, setLinhas] = useState<LinhaRelatorio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro(null);
      setLinhas([]);

      if (!inicio || !fim || inicio > fim) {
        setErro('Informe um período válido: a data inicial deve ser anterior ou igual à data final.');
        setCarregando(false);
        return;
      }

      try {
        const anoInicial = Number(inicio.slice(0, 4));
        const anoFinal = Number(fim.slice(0, 4));
        const [vendas, metas, closers] = await Promise.all([
          buscarVendas(inicio, fim),
          buscarMetas(anoInicial, anoFinal),
          buscarClosers(),
        ]);
        if (cancelado) return;

        const metasPorMes = new Map(
          metas.map((meta) => [`${meta.vendedor_id}-${meta.ano}-${meta.mes}`, meta.meta_vendas]),
        );
        const closersPorId = new Map(closers.map((closer) => [closer.id, closer]));
        const grupos = new Map<string, LinhaRelatorio>();

        for (const mes of mesesNoPeriodo(inicio, fim)) {
          const [ano, numeroMes] = mes.split('-').map(Number);
          for (const closer of closers) {
            grupos.set(`${closer.id}-${mes}`, {
              mes,
              closerId: closer.id,
              closerNome: closer.nome,
              vendas: 0,
              canceladas: 0,
              vgv: 0,
              meta: metasPorMes.get(`${closer.id}-${ano}-${numeroMes}`) ?? null,
            });
          }
        }

        for (const venda of vendas) {
          if (venda.closer_id === null) continue;
          const mes = venda.data_venda.slice(0, 7);
          const chave = `${venda.closer_id}-${mes}`;
          let linha = grupos.get(chave);

          if (!linha) {
            const closer = venda.closer ?? closersPorId.get(venda.closer_id);
            if (!closer) continue;
            linha = {
              mes,
              closerId: venda.closer_id,
              closerNome: closer.nome,
              vendas: 0,
              canceladas: 0,
              vgv: 0,
              meta: null,
            };
            grupos.set(chave, linha);
          }

          linha.vendas += 1;
          if (venda.status === 'cancelada') linha.canceladas += 1;
          if (venda.status === 'ativa') linha.vgv += Number(venda.valor);
        }

        setLinhas(Array.from(grupos.values()).sort(
          (a, b) => b.mes.localeCompare(a.mes) || a.closerNome.localeCompare(b.closerNome, 'pt-BR'),
        ));
      } catch (erroCarregamento) {
        if (!cancelado) setErro(mensagemDoErro(erroCarregamento));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregar();
    return () => { cancelado = true; };
  }, [inicio, fim]);

  const totais = useMemo(() => {
    const metaCompleta = linhas.every((linha) => linha.meta !== null);
    return {
      vendas: linhas.reduce((total, linha) => total + linha.vendas, 0),
      canceladas: linhas.reduce((total, linha) => total + linha.canceladas, 0),
      vgv: linhas.reduce((total, linha) => total + linha.vgv, 0),
      meta: metaCompleta ? linhas.reduce((total, linha) => total + (linha.meta ?? 0), 0) : null,
    };
  }, [linhas]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs text-slate-500">Data inicial</span>
          <input type="date" value={inicio} max={fim} onChange={(event) => setInicio(event.target.value)} className="rounded-md border bg-white px-2 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-slate-500">Data final</span>
          <input type="date" value={fim} min={inicio} onChange={(event) => setFim(event.target.value)} className="rounded-md border bg-white px-2 py-1.5" />
        </label>
        <span className="pb-2 text-xs text-slate-500">
          {carregando ? 'Carregando…' : `${linhas.length} linha(s)`}
        </span>
      </div>

      {erro && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Erro ao carregar: {erro}</p>}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Mês</th>
              <th className="px-3 py-2">Closer</th>
              <th className="px-3 py-2 text-right">Vendas</th>
              <th className="px-3 py-2 text-right">Canceladas</th>
              <th className="px-3 py-2 text-right">% canceladas</th>
              <th className="px-3 py-2 text-right">VGV (ativas)</th>
              <th className="px-3 py-2 text-right">Meta mensal</th>
              <th className="px-3 py-2 text-right">% da meta</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Carregando relatório…</td></tr>
            )}
            {linhas.map((linha) => (
              <tr key={`${linha.closerId}-${linha.mes}`} className="border-t">
                <td className="px-3 py-1.5">{rotuloDoMes(linha.mes)}</td>
                <td className="px-3 py-1.5">{linha.closerNome}</td>
                <td className="px-3 py-1.5 text-right">{linha.vendas}</td>
                <td className="px-3 py-1.5 text-right">{linha.canceladas}</td>
                <td className="px-3 py-1.5 text-right">
                  {percentual(linha.vendas === 0 ? 0 : (linha.canceladas / linha.vendas) * 100)}
                </td>
                <td className="px-3 py-1.5 text-right">{formatarMoeda(linha.vgv)}</td>
                <td className="px-3 py-1.5 text-right">{linha.meta === null ? '—' : linha.meta}</td>
                <td className="px-3 py-1.5 text-right">
                  {linha.meta === null || linha.meta === 0 ? '—' : percentual((linha.vendas / linha.meta) * 100)}
                </td>
              </tr>
            ))}
            {!carregando && !erro && linhas.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Nenhuma venda encontrada no período.</td></tr>
            )}
            {!carregando && !erro && linhas.length > 0 && (
              <tr className="border-t bg-slate-50 font-semibold">
                <td className="px-3 py-2" colSpan={2}>Total</td>
                <td className="px-3 py-2 text-right">{totais.vendas}</td>
                <td className="px-3 py-2 text-right">{totais.canceladas}</td>
                <td className="px-3 py-2 text-right">
                  {percentual(totais.vendas === 0 ? 0 : (totais.canceladas / totais.vendas) * 100)}
                </td>
                <td className="px-3 py-2 text-right">{formatarMoeda(totais.vgv)}</td>
                <td className="px-3 py-2 text-right">{totais.meta === null ? '—' : totais.meta}</td>
                <td className="px-3 py-2 text-right">
                  {totais.meta === null || totais.meta === 0 ? '—' : percentual((totais.vendas / totais.meta) * 100)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}