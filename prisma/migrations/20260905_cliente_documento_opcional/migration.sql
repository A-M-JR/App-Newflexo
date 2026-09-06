-- =============================================================================
-- Cliente: documento e endereço deixam de ser obrigatórios.
--
-- Motivo: a base atende também o Paraguai (e outros países), onde não existe
-- CNPJ/CPF e o endereço não segue CEP nem UF de duas letras.
--
-- BANCO DE PRODUÇÃO. Leia as três partes antes de rodar. Elas são separadas de
-- propósito: a PARTE 1 é a única necessária para o sistema voltar a funcionar,
-- e ela não escreve em nenhuma linha.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PARTE 0 — CONFERÊNCIA (só leitura, não altera nada)
--
-- Rode isto primeiro e guarde o resultado. Mostra quantas linhas a PARTE 2
-- tocaria. Se vier tudo zero, a PARTE 2 é dispensável.
-- -----------------------------------------------------------------------------
-- SELECT
--   COUNT(*)                                          AS total_clientes,
--   COUNT(*) FILTER (WHERE btrim("cnpj")     = '')    AS cnpj_vazio,
--   COUNT(*) FILTER (WHERE btrim("telefone") = '')    AS telefone_vazio,
--   COUNT(*) FILTER (WHERE btrim("cep")      = '')    AS cep_vazio,
--   COUNT(*) FILTER (WHERE btrim("cidade")   = '')    AS cidade_vazio,
--   COUNT(*) FILTER (WHERE btrim("estado")   = '')    AS estado_vazio
-- FROM "Cliente";


-- -----------------------------------------------------------------------------
-- PARTE 1 — ESTRUTURA (obrigatória)
--
-- NÃO escreve em nenhuma linha. Só afrouxa restrições e cria uma coluna nova.
-- Nenhum dado existente é apagado, movido ou reescrito.
--
-- O índice único de "cnpj" continua valendo: no Postgres um unique aceita
-- vários NULL, então vários clientes sem documento convivem sem conflito.
-- -----------------------------------------------------------------------------
ALTER TABLE "Cliente" ALTER COLUMN "cnpj"     DROP NOT NULL;
ALTER TABLE "Cliente" ALTER COLUMN "telefone" DROP NOT NULL;
ALTER TABLE "Cliente" ALTER COLUMN "cep"      DROP NOT NULL;
ALTER TABLE "Cliente" ALTER COLUMN "cidade"   DROP NOT NULL;
ALTER TABLE "Cliente" ALTER COLUMN "estado"   DROP NOT NULL;

-- Clientes já cadastrados passam a constar como "Brasil".
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "pais" TEXT DEFAULT 'Brasil';


-- -----------------------------------------------------------------------------
-- PARTE 2 — LIMPEZA (opcional, e esta ESCREVE)
--
-- Troca string vazia por NULL, para "sem informação" ter uma representação só.
-- Só atinge linhas que já estão vazias; nenhum valor preenchido é alterado.
--
-- Vale rodar pelo seguinte: um cliente antigo gravado com cnpj = '' ocupa o
-- índice único e impediria que um SEGUNDO cliente ficasse sem documento. Como o
-- índice é único, no máximo uma linha está nessa situação.
--
-- Se a PARTE 0 devolveu tudo zero, pule esta parte.
-- Se preferir, rode só a primeira linha (a do cnpj) e deixe as outras quatro,
-- que são apenas cosméticas — servem para a tela mostrar "—" em vez de vazio.
-- -----------------------------------------------------------------------------
-- UPDATE "Cliente" SET "cnpj"     = NULL WHERE btrim("cnpj")     = '';
-- UPDATE "Cliente" SET "telefone" = NULL WHERE btrim("telefone") = '';
-- UPDATE "Cliente" SET "cep"      = NULL WHERE btrim("cep")      = '';
-- UPDATE "Cliente" SET "cidade"   = NULL WHERE btrim("cidade")   = '';
-- UPDATE "Cliente" SET "estado"   = NULL WHERE btrim("estado")   = '';


-- -----------------------------------------------------------------------------
-- VOLTA ATRÁS (se precisar desfazer a PARTE 1)
--
-- Atenção: SET NOT NULL só passa se nenhuma linha estiver com NULL naquela
-- coluna. Se algum cliente já tiver sido salvo sem documento, preencha ou apague
-- esse cadastro antes.
-- -----------------------------------------------------------------------------
-- ALTER TABLE "Cliente" DROP COLUMN "pais";
-- ALTER TABLE "Cliente" ALTER COLUMN "estado"   SET NOT NULL;
-- ALTER TABLE "Cliente" ALTER COLUMN "cidade"   SET NOT NULL;
-- ALTER TABLE "Cliente" ALTER COLUMN "cep"      SET NOT NULL;
-- ALTER TABLE "Cliente" ALTER COLUMN "telefone" SET NOT NULL;
-- ALTER TABLE "Cliente" ALTER COLUMN "cnpj"     SET NOT NULL;
