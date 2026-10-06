# Duque Mini — teste técnico (MME Vacation Club)

Este é um pedaço bem pequeno do sistema que usamos na MME, com **dados fictícios**.
Ele mostra vendas de um clube de férias: o cliente passa por um **atendimento** (promotor → liner → closer),
pode fechar uma **venda** de um produto, e a venda vira 12 **parcelas**. Cada closer e liner tem uma **meta** mensal.

O objetivo não é código perfeito. É ver como você entende um sistema que já existe, como resolve
problemas e como explica o que fez.

## Regras
- **Pode usar IA** (ChatGPT, Claude, Copilot, Cursor, o que você usa no dia a dia). Queremos ver *como* você usa.
- Pode pesquisar na internet.
- Pergunte sempre que algo não estiver claro. Perguntar é bom sinal, não ruim.
- Compartilhe a tela e vá explicando em voz alta o que está pensando.
- Explique como se fosse para alguém que não programa.

## Como rodar
Precisa de Node 20 ou mais novo.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer (normalmente http://localhost:5180).
O arquivo `.env` já vem preenchido com o banco de teste (ele é descartável, por isso está no repositório).

## O que tem no banco
Banco Postgres no Supabase, **somente leitura**. Estrutura em `supabase/01_estrutura.sql`, dados em `supabase/02_dados.sql`.

| Tabela | O que é |
|---|---|
| `vendedores` | pessoas do time: promotor, liner ou closer |
| `clientes` | quem foi atendido |
| `atendimentos` | cada atendimento, com quem participou e o status (`finalizado` e `sn` contam como válidos; `nq` = não qualificado) |
| `vendas` | vendas fechadas (status `ativa` ou `cancelada`, com motivo) |
| `produtos` | o que é vendido, com o empreendimento |
| `metas` | meta de vendas por pessoa, ano e mês |
| `parcelas` | 12 parcelas por venda; `pago_em` vazio = não paga |

Datas no banco são só dia (`AAAA-MM-DD`), sem hora.

## Tarefas

### Tarefa 1 — Entender (10 min)
Abra `src/paginas/Vendas.tsx` e explique em voz alta, como para alguém que não programa,
o caminho que o dado faz: de onde vem, por onde passa, como chega na tela.

### Tarefa 2 — Chamados dos usuários (30 min)
Os usuários abriram quatro chamados sobre a aba **Vendas**. Encontre a causa, corrija e anote
a explicação de cada um no `RESPOSTAS.md` (uma ou duas linhas por chamado).

1. "A data da venda aparece **um dia antes** da data que eu lancei."
2. "Quando escolho um closer no filtro, a lista **fica vazia**, mesmo ele tendo vendas."
3. "O cartão **Vendas ativas** mostra o mesmo número do total de linhas, mas tem vendas canceladas na lista."
4. "Em **Todas as datas** aparecem 1.000 vendas. Na planilha do financeiro tem mais de 1.300."

### Tarefa 3 — Construir (30 a 40 min)
Na aba **Relatório**, monte o relatório **Vendas por vendedor por mês**:

- Filtro de período (data inicial e data final).
- Uma linha por **closer** e mês, com: vendas (ativas + canceladas), canceladas, % canceladas,
  VGV (soma do valor das ativas), meta do mês (tabela `metas`) e % da meta (vendas ÷ meta).
- Ordene do mês mais recente para o mais antigo e, dentro do mês, por nome.
- Se sobrar tempo: linha de totais no rodapé.

Use a biblioteca que quiser para a tela, ou só o que já tem no projeto.

### Tarefa 4 — Se sobrar tempo
"A aba **Vendedores** demora para abrir." Descubra por quê e deixe rápida.

### Tarefa 5 — Se sobrar tempo (só SQL)
Escreva uma consulta SQL que liste os **clientes com parcela vencida e não paga**, com a quantidade
de parcelas em atraso e o valor total em atraso, do maior para o menor. Cole no `RESPOSTAS.md`.

## Entrega
- Crie uma branch com o seu nome (`git checkout -b seu-nome`) e faça commits do que fizer.
- Preencha o `RESPOSTAS.md`.
- No fim, envie a branch (ou um zip da pasta sem `node_modules`).
