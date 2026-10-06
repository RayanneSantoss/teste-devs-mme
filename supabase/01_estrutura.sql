-- Estrutura do banco de teste (Duque Mini). Dados 100% fictícios.
-- Fluxo igual ao do sistema real: cliente -> atendimento (promotor, liner, closer) -> venda -> parcelas.

create table vendedores (
  id serial primary key,
  nome text not null,
  funcao text not null check (funcao in ('promotor', 'liner', 'closer')),
  ativo boolean not null default true
);

create table produtos (
  id serial primary key,
  nome text not null,
  empreendimento text not null,
  valor_tabela numeric(12,2) not null
);

create table clientes (
  id serial primary key,
  nome text not null,
  cidade text,
  estado text,
  telefone text
);

-- status: finalizado e sn ("sem negociação") contam como atendimento válido; nq = não qualificado.
create table atendimentos (
  id serial primary key,
  cliente_id int not null references clientes (id),
  data date not null,
  promotor_id int references vendedores (id),
  liner_id int references vendedores (id),
  closer_id int references vendedores (id),
  status text not null check (status in ('finalizado', 'sn', 'nq', 'cancelado')),
  hotel text
);

create table vendas (
  id serial primary key,
  atendimento_id int not null references atendimentos (id),
  cliente_id int not null references clientes (id),
  produto_id int not null references produtos (id),
  closer_id int references vendedores (id),
  liner_id int references vendedores (id),
  data_venda date not null,
  valor numeric(12,2) not null,
  status text not null default 'ativa' check (status in ('ativa', 'cancelada')),
  motivo_cancelamento text,
  criado_em timestamptz not null default now()
);

-- meta de vendas por pessoa e mês (closers e liners)
create table metas (
  id serial primary key,
  vendedor_id int not null references vendedores (id),
  ano int not null,
  mes int not null check (mes between 1 and 12),
  meta_vendas int not null,
  unique (vendedor_id, ano, mes)
);

-- 12 parcelas por venda; pago_em vazio = ainda não paga
create table parcelas (
  id serial primary key,
  venda_id int not null references vendas (id),
  numero int not null,
  vencimento date not null,
  valor numeric(12,2) not null,
  pago_em date
);

-- Segurança: o site usa a chave pública (anon) e só pode LER.
alter table vendedores enable row level security;
alter table produtos enable row level security;
alter table clientes enable row level security;
alter table atendimentos enable row level security;
alter table vendas enable row level security;
alter table metas enable row level security;
alter table parcelas enable row level security;
create policy "leitura" on vendedores for select to anon, authenticated using (true);
create policy "leitura" on produtos for select to anon, authenticated using (true);
create policy "leitura" on clientes for select to anon, authenticated using (true);
create policy "leitura" on atendimentos for select to anon, authenticated using (true);
create policy "leitura" on vendas for select to anon, authenticated using (true);
create policy "leitura" on metas for select to anon, authenticated using (true);
create policy "leitura" on parcelas for select to anon, authenticated using (true);
