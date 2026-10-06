-- Dados fictícios gerados automaticamente. Pode rodar de novo para recomeçar do zero.
truncate parcelas, metas, vendas, atendimentos, clientes, produtos, vendedores restart identity cascade;
select setseed(0.42);

insert into vendedores (nome, funcao, ativo) values
  ('Ana Beatriz Lima', 'promotor', true), ('Carlos Eduardo Souza', 'promotor', true), ('Fernanda Rocha', 'promotor', true),
  ('Gustavo Henrique Melo', 'promotor', true), ('Juliana Freitas', 'promotor', true),
  ('Rafael Albuquerque', 'liner', true), ('Patrícia Nogueira', 'liner', true), ('Bruno Cavalcante', 'liner', true),
  ('Larissa Monteiro', 'liner', true), ('Diego Ferreira', 'liner', true),
  ('Mariana Castro', 'closer', true), ('Thiago Barbosa', 'closer', true), ('Camila Andrade', 'closer', true),
  ('Rodrigo Teixeira', 'closer', true), ('Vanessa Oliveira', 'closer', true),
  ('Paulo Sérgio Ramos', 'closer', false);

insert into produtos (nome, empreendimento, valor_tabela) values
  ('Standard Coral', 'Condomínio Ipioca Mar Resort', 52000), ('Exclusive Praia', 'Condomínio Ipioca Mar Resort', 68000),
  ('Bangalô Sagui', 'Reserva Marinho', 89000), ('Diamante G', 'Reserva Marinho', 120000),
  ('Flat Garden', 'Maceió Beach Flats', 45000), ('Flat Vista Mar', 'Maceió Beach Flats', 61000),
  ('Suíte Família', 'Ipioca Family Club', 38000), ('Cota Ouro', 'Ipioca Family Club', 27000);

-- 2.200 clientes com nomes e cidades sorteados
with nomes as (
  select array['Maria','José','Ana','João','Antônio','Francisca','Carlos','Paulo','Pedro','Lucas','Luiz','Marcos','Luís','Gabriel','Rafael','Francisco','Daniel','Marcelo','Bruno','Eduardo','Felipe','Raimundo','Rodrigo','Manoel','Nelson','Roberto','Fábio','Alexandre','Adriana','Juliana','Márcia','Fernanda','Patrícia','Aline','Sandra','Camila','Amanda','Bruna','Jéssica','Letícia','Júlia','Luciana','Vanessa','Mariana','Gabriela','Vera','Vitória','Larissa','Cláudia','Simone','Renata','Débora','Elaine','Rosângela','Tatiane','Isabela','Sônia','Regina','Cristiane','Beatriz'] n,
         array['Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes','Costa','Ribeiro','Martins','Carvalho','Almeida','Lopes','Soares','Fernandes','Vieira','Barbosa','Rocha','Dias','Nascimento','Andrade','Moreira','Nunes','Marques','Machado','Mendes','Freitas','Cardoso','Ramos','Gonçalves','Santana','Teixeira','Araújo','Melo','Cavalcante','Monteiro','Correia'] s
),
cidades as (
  select array[['Maceió','AL'],['Recife','PE'],['Aracaju','SE'],['Salvador','BA'],['São Paulo','SP'],['Brasília','DF'],['Belo Horizonte','MG'],['Curitiba','PR'],['Goiânia','GO'],['Fortaleza','CE'],['Arapiraca','AL'],['Caruaru','PE'],['Campinas','SP'],['Rio de Janeiro','RJ'],['Natal','RN']] c
)
insert into clientes (nome, cidade, estado, telefone)
select n[1 + floor(random() * array_length(n, 1))::int] || ' ' || s[1 + floor(random() * array_length(s, 1))::int] || ' ' || s[1 + floor(random() * array_length(s, 1))::int],
       c[x.i][1], c[x.i][2],
       '(' || (array['82','81','79','71','11','61','31','41','62','85'])[1 + floor(random() * 10)::int] || ') 9'
         || lpad(floor(random() * 10000)::text, 4, '0') || '-' || lpad(floor(random() * 10000)::text, 4, '0')
from nomes, cidades, (select g, 1 + floor(random() * 15)::int i from generate_series(1, 2200) g) x;

-- 2.600 atendimentos entre 01/08/2025 e 06/10/2026
insert into atendimentos (cliente_id, data, promotor_id, liner_id, closer_id, status, hotel)
select 1 + floor(random() * 2200)::int,
       date '2025-08-01' + floor(random() * 432)::int,
       1 + floor(random() * 5)::int, 6 + floor(random() * 5)::int, 11 + floor(random() * 5)::int,
       case when x.r < 0.55 then 'finalizado' when x.r < 0.75 then 'sn' when x.r < 0.90 then 'nq' else 'cancelado' end,
       (array['Jatiúca Resort','Ritz Lagoa da Anta','Salinas Maragogi','Pousada Ipioca','Hotel Ponta Verde','Carmel Magna Praia'])[1 + floor(random() * 6)::int]
from (select g, random() r from generate_series(1, 2600) g) x;

-- vendas em cerca de 68% dos atendimentos válidos; 12% canceladas
insert into vendas (atendimento_id, cliente_id, produto_id, closer_id, liner_id, data_venda, valor, status, motivo_cancelamento)
select a.id, a.cliente_id, p.id, a.closer_id, a.liner_id, a.data,
       round((p.valor_tabela * (0.85 + random() * 0.30))::numeric, 2),
       case when a.r2 < 0.12 then 'cancelada' else 'ativa' end,
       case when a.r2 < 0.12 then (array['Desistência','Problema financeiro','Arrependimento no prazo legal','Não entendeu o produto','Outro'])[1 + floor(random() * 5)::int] end
from (select a.*, random() r1, random() r2, 1 + floor(random() * 8)::int pid from atendimentos a) a
join produtos p on p.id = a.pid
where a.status in ('finalizado', 'sn') and a.r1 < 0.68;

-- metas mensais de closers e liners ativos
insert into metas (vendedor_id, ano, mes, meta_vendas)
select v.id, extract(year from m)::int, extract(month from m)::int,
       case when v.funcao = 'closer' then 15 + floor(random() * 11)::int else 14 + floor(random() * 11)::int end
from vendedores v, generate_series(date '2025-08-01', date '2026-10-01', interval '1 month') m
where v.funcao in ('closer', 'liner') and v.ativo;

-- 12 parcelas por venda (entrada + 11); vencidas têm 85% de chance de estarem pagas
insert into parcelas (venda_id, numero, vencimento, valor, pago_em)
select v.id, n, (v.data_venda + ((n - 1) * interval '1 month'))::date, round(v.valor / 12.0, 2),
       case
         when n = 1 then v.data_venda
         when v.status = 'cancelada' then null
         when (v.data_venda + ((n - 1) * interval '1 month'))::date >= current_date then null
         when random() < 0.85 then (v.data_venda + ((n - 1) * interval '1 month'))::date + floor(random() * 6)::int
         else null
       end
from vendas v, generate_series(1, 12) n;
