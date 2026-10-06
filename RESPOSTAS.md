# Respostas do candidato

Preencha com suas palavras, em português simples. Não precisa ser longo.

## Tarefa 2 — chamados
Para cada chamado: qual era a causa e o que você mudou.

- Chamado 1 (data um dia antes): 
O banco retorna a data no formato padrão AAAA-MM-DD.
Ao usar new Date(data) no frontend, a data sofria conversão
de fuso horário e podia aparecer um dia antes.
A solução foi formatar a string diretamente para DD/MM/AAAA,
sem fazer a conversão para Date.

- Chamado 2 (filtro de closer):
A condição comparava o nome do closer com o ID do vendedor,
fazendo com que a comparação nunca fosse verdadeira.

- Chamado 3 (cartão "Vendas ativas"):
Estava sendo usado filtradas.length para calcular as vendas ativas,
o que contava tanto as vendas ativas quanto as canceladas.

- Chamado 4 (1.000 vendas): 
A lista parava em 1.000 vendas porque a consulta original fazia
apenas uma chamada ao Supabase, que retornava no máximo 1.000 registros.
As vendas além desse limite não eram carregadas.
A solução foi buscar os resultados em páginas menores, até carregar todas as vendas.

## Tarefa 3 — relatório
Como você montou? Alguma decisão que tomou sozinho e quer registrar?
Busquei vendas, metas e closers no Supabase com paginação, agrupei as vendas no navegador por closer e mês, calculei os indicadores com as regras do enunciado e exibi numa tabela ordenada. Por decisão minha, incluí closers sem vendas para que a meta também possa ser comparada, e deixei percentuais indisponíveis quando a meta não existe ou é zero.

## Tarefa 4 — página Vendedores lenta (se fez)
Causa e solução:

A causa era que o for fazia consultas ao banco em sequência para cada vendedor, aguardando cada resposta antes de continuar. A solução foi executar as consultas em paralelo com Promise.all, reduzindo o tempo de espera.

## Tarefa 5 — consulta SQL (se fez)
Cole a consulta aqui:

```sql
SELECT
  clientes.id,
  clientes.nome,
  COUNT(*) AS parcelas_em_atraso,
  SUM(parcelas.valor) AS valor_total_em_atraso
FROM clientes
JOIN vendas ON vendas.cliente_id = clientes.id
JOIN parcelas ON parcelas.venda_id = vendas.id
WHERE parcelas.vencimento < CURRENT_DATE
  AND parcelas.pago_em IS NULL
GROUP BY clientes.id, clientes.nome
ORDER BY valor_total_em_atraso DESC, parcelas_em_atraso DESC;
```

## Observações
Qualquer coisa que você notou no projeto e acha que vale comentar.

