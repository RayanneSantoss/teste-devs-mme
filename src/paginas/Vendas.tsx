import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatarData, formatarMoeda, primeiroDiaDoMes } from '../lib/formatadores';

type Venda = {
  id: number;
  data_venda: string;
  valor: number;
  status: string;
  motivo_cancelamento: string | null;
  closer_id: number;
  cliente: { nome: string } | null;
  produto: { nome: string; empreendimento: string } | null;
  closer: { nome: string } | null;
};
type Vendedor = { id: number; nome: string };

const PERIODOS = [
  { valor: 'mes', rotulo: 'Mês atual' },
  { valor: '3m', rotulo: 'Últimos 3 meses' },
  { valor: 'todas', rotulo: 'Todas as datas' },
];

/** Primeiro dia do período escolhido. null = sem filtro de data. */
function inicioDoPeriodo(periodo: string): string | null {
  const hoje = new Date();
  if (periodo === 'mes') return primeiroDiaDoMes(hoje.getFullYear(), hoje.getMonth());
  if (periodo === '3m') return primeiroDiaDoMes(hoje.getFullYear(), hoje.getMonth() - 2);
  return null;
}

export function Vendas() {
  const [periodo, setPeriodo] = useState('3m');
  const [vendedorId, setVendedorId] = useState('');
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // lista de closers para o filtro
  useEffect(() => {
    supabase
      .from('vendedores')
      .select('id, nome')
      .eq('funcao', 'closer')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => setVendedores((data ?? []) as Vendedor[]));
  }, []);

  // vendas do período
  useEffect(() => {
     // Qual era o problema?
    // A lista parava em 1.000 vendas porque a consulta original fazia
   // apenas uma chamada ao Supabase, que retornava no máximo 1.000 registros.
  // As vendas além desse limite não eram carregadas.
 // A solução foi buscar os resultados em páginas menores, até carregar todas as vendas.
 
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      const tamanhoPagina = 500;
      const todas:Venda[] = [];
      const inicio = inicioDoPeriodo(periodo);

      for(let de = 0; ; de += tamanhoPagina) {
      let consulta = supabase
        .from('vendas')
        .select(
          'id, data_venda, valor, status, motivo_cancelamento, closer_id, cliente:clientes(nome), produto:produtos(nome, empreendimento), closer:vendedores!vendas_closer_id_fkey(nome)',
        )
        .order('data_venda', { ascending: false })
        .order('id', { ascending: false })
        .range(de, de + tamanhoPagina - 1);

        if(inicio) consulta = consulta.gte('data_venda', inicio);
        const { data, error } = await consulta;
        if (cancelado) return;
        if (error){
         setErro(error.message);
         setCarregando(false);
         return;
        } 
        
      const pagina = (data ?? []) as unknown as Venda[];
      todas.push(...pagina);

      if(pagina.length < tamanhoPagina) break;
      }
    if (cancelado) return;

    setVendas(todas);
    setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [periodo]);

  const filtradas = useMemo(
    // Qual era o problema?
   // A condição comparava o nome do closer com o ID do vendedor,
  // fazendo com que a comparação nunca fosse verdadeira.
    () => (vendedorId ? vendas.filter((v) => v.closer_id === Number(vendedorId)) : vendas),
    [vendas, vendedorId],
  );

  const resumo = useMemo(
    () => ({
      // Qual era o problema?
     // Estava sendo usado filtradas.length para calcular as vendas ativas,
    // o que contava tanto as vendas ativas quanto as canceladas.
      ativas: filtradas.filter((v) => v.status === 'ativa').length,
      canceladas: filtradas.filter((v) => v.status === 'cancelada').length,
      vgv: filtradas.filter((v) => v.status === 'ativa').reduce((soma, v) => soma + Number(v.valor), 0),
    }),
    [filtradas],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs text-slate-500">Período</span>
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="rounded-md border bg-white px-2 py-1.5">
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-slate-500">Closer</span>
          <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className="rounded-md border bg-white px-2 py-1.5">
            <option value="">Todos</option>
            {vendedores.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.nome}
              </option>
            ))}
          </select>
        </label>
        <span className="pb-2 text-xs text-slate-500">{carregando ? 'Carregando…' : `${filtradas.length} venda(s) na lista`}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Cartao rotulo="Vendas ativas" valor={String(resumo.ativas)} />
        <Cartao rotulo="VGV (vendas ativas)" valor={formatarMoeda(resumo.vgv)} />
        <Cartao rotulo="Canceladas" valor={String(resumo.canceladas)} cor="text-red-600" />
      </div>

      {erro && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Erro ao carregar: {erro}</p>}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Produto</th>
              <th className="px-3 py-2">Empreendimento</th>
              <th className="px-3 py-2">Closer</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2">Situação</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="px-3 py-1.5">{formatarData(v.data_venda)}</td>
                <td className="px-3 py-1.5">{v.cliente?.nome}</td>
                <td className="px-3 py-1.5">{v.produto?.nome}</td>
                <td className="px-3 py-1.5">{v.produto?.empreendimento}</td>
                <td className="px-3 py-1.5">{v.closer?.nome}</td>
                <td className="px-3 py-1.5 text-right">{formatarMoeda(Number(v.valor))}</td>
                <td className="px-3 py-1.5">
                  {v.status === 'cancelada' ? (
                    <span className="text-red-600">Cancelada{v.motivo_cancelamento ? ` · ${v.motivo_cancelamento}` : ''}</span>
                  ) : (
                    <span className="text-emerald-700">Ativa</span>
                  )}
                </td>
              </tr>
            ))}
            {!carregando && filtradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  Nenhuma venda encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cartao({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs uppercase text-slate-500">{rotulo}</p>
      <p className={`text-2xl font-bold ${cor ?? ''}`}>{valor}</p>
    </div>
  );
}
