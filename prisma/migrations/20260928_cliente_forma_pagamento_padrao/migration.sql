-- =============================================================================
-- Cliente: condição de pagamento padrão.
--
-- Motivo: alguns clientes sempre compram na mesma condição (ex: 15/30/45). Ela
-- fica gravada no cadastro e o orçamento já abre com ela selecionada.
--
-- BANCO DE PRODUÇÃO. Rode ANTES de publicar o código novo: o Prisma passa a ler
-- essa coluna em toda consulta de cliente, e sem ela as telas param de carregar.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ESTRUTURA (obrigatória)
--
-- NÃO escreve em nenhuma linha. Cria uma coluna nova, vazia (NULL) para todos
-- os clientes, e a chave estrangeira para FormaPagamento. Se a forma de
-- pagamento for apagada, o cliente só perde o padrão (SET NULL).
-- -----------------------------------------------------------------------------
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "formaPagamentoPadraoId" INTEGER;

ALTER TABLE "Cliente"
  ADD CONSTRAINT "Cliente_formaPagamentoPadraoId_fkey"
  FOREIGN KEY ("formaPagamentoPadraoId") REFERENCES "FormaPagamento"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;


-- -----------------------------------------------------------------------------
-- VOLTA ATRÁS
--
-- Só remova a coluna depois de voltar o código para a versão anterior.
-- -----------------------------------------------------------------------------
-- ALTER TABLE "Cliente" DROP CONSTRAINT "Cliente_formaPagamentoPadraoId_fkey";
-- ALTER TABLE "Cliente" DROP COLUMN "formaPagamentoPadraoId";
