import { useState } from 'react';
import { Vendas } from './paginas/Vendas';
import { Vendedores } from './paginas/Vendedores';
import { Relatorio } from './paginas/Relatorio';

const ABAS = [
  { chave: 'vendas', rotulo: 'Vendas' },
  { chave: 'vendedores', rotulo: 'Vendedores' },
  { chave: 'relatorio', rotulo: 'Relatório' },
] as const;
type Aba = (typeof ABAS)[number]['chave'];

export default function App() {
  const [aba, setAba] = useState<Aba>('vendas');
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold">Duque Mini</h1>
            <p className="text-xs text-slate-500">Teste técnico · MME Vacation Club · todos os dados são fictícios</p>
          </div>
          <nav className="flex gap-1">
            {ABAS.map((a) => (
              <button
                key={a.chave}
                onClick={() => setAba(a.chave)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${aba === a.chave ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {a.rotulo}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {aba === 'vendas' && <Vendas />}
        {aba === 'vendedores' && <Vendedores />}
        {aba === 'relatorio' && <Relatorio />}
      </main>
    </div>
  );
}
