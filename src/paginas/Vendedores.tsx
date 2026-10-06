import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatarMoeda } from '../lib/formatadores';

type Linha = { id: number; nome: string; funcao: string; atendimentos: number; vendas: number; canceladas: number; vgv: number };
type VendaResumo = { valor: number; status: string };

const FUNCAO: Record<string, string> = { promotor: 'Promotor', liner: 'Liner', closer: 'Closer' };

export function Vendedores() {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tempo, setTempo] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      const inicio = performance.now();
      const { data: vendedores } = await supabase.from('vendedores').select('id, nome, funcao').eq('ativo', true).order('funcao').order('nome');
      const resultado: Linha[] = await Promise.all(
      (vendedores ?? []).map(async (v): Promise<Linha> => {
        const campo = v.funcao === 'promotor'
          ? 'promotor_id'
          : v.funcao === 'liner'
            ? 'liner_id'
            : 'closer_id';

        // As duas consultas deste vendedor rodam em paralelo.
        const [atendimentosResult, vendasResult] = await Promise.all([
          supabase
            .from('atendimentos')
            .select('id', { count: 'exact', head: true })
            .eq(campo, v.id),
          v.funcao === 'promotor'
            ? supabase
                .from('vendas')
                .select('valor, status, atendimento:atendimentos!inner(promotor_id)')
                .eq('atendimento.promotor_id', v.id)
            : supabase
                .from('vendas')
                .select('valor, status')
                .eq(campo, v.id),
        ]);

        if (atendimentosResult.error) throw atendimentosResult.error;
        if (vendasResult.error) throw vendasResult.error;

        const vendas = (vendasResult.data ?? []) as unknown as VendaResumo[];
        return {
          id: v.id,
          nome: v.nome,
          funcao: v.funcao,
          atendimentos: atendimentosResult.count ?? 0,
          vendas: vendas.length,
          canceladas: vendas.filter((venda) => venda.status === 'cancelada').length,
          vgv: vendas
            .filter((venda) => venda.status === 'ativa')
            .reduce((soma, venda) => soma + Number(venda.valor), 0),
        };
      }),
    );
      if (cancelado) return;
      setLinhas(resultado);
      setTempo(Math.round(performance.now() - inicio));
      setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{carregando ? 'Carregando…' : `Carregou em ${tempo} ms`}</p>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Função</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2 text-right">Atendimentos</th>
              <th className="px-3 py-2 text-right">Vendas</th>
              <th className="px-3 py-2 text-right">Canceladas</th>
              <th className="px-3 py-2 text-right">VGV (ativas)</th>
              <th className="px-3 py-2 text-right">Eficiência</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-1.5">{FUNCAO[l.funcao] ?? l.funcao}</td>
                <td className="px-3 py-1.5">{l.nome}</td>
                <td className="px-3 py-1.5 text-right">{l.atendimentos}</td>
                <td className="px-3 py-1.5 text-right">{l.vendas}</td>
                <td className="px-3 py-1.5 text-right">{l.canceladas}</td>
                <td className="px-3 py-1.5 text-right">{formatarMoeda(l.vgv)}</td>
                <td className="px-3 py-1.5 text-right">{l.atendimentos > 0 ? `${((l.vendas / l.atendimentos) * 100).toFixed(1)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Eficiência = vendas ÷ atendimentos da pessoa.</p>
    </div>
  );
}
