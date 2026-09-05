# Plano de Correção — Auditoria de Segurança (App Newflexo)

> Arquivo de acompanhamento por etapas. Marque `[x]` conforme concluir.
> Legenda de status: ⬜ pendente · 🟡 em andamento · ✅ concluído · ⏭️ adiado
>
> Relatório completo: [relatorio-auditoria-seguranca.pdf](relatorio-auditoria-seguranca.pdf)
> Última atualização: 2026-09-04

## Placar
| Severidade | Qtde | Concluídos |
|---|---|---|
| 🔴 Crítica | 6 | 0 |
| 🟠 Alta | 7 | 0 |
| 🟡 Média | 3 | 0 |
| 🔵 Baixa | 2 | 0 |
| **Total** | **18** | **0** |

---

## Etapa P1 — Fundamentos (bloqueadores)

> A causa-raiz é a ausência de sessão no servidor. Enquanto não resolvido, os controles de isolamento/posse continuam contornáveis. Faça P1.1 antes de P1.2.

### P1.1 — Sessão/autenticação no servidor  · Status: ⬜
- [ ] Trocar sessão em `localStorage` por cookie **httpOnly + Secure + SameSite** (ou JWT verificado no servidor)
- [ ] Criar helper `getSessionUser()` no servidor; derivar usuário/papel/vendedor SEMPRE da sessão
- [ ] Adicionar `middleware.ts` protegendo páginas e negando não autenticados
- [ ] `verifySession` deixa de receber `userId` do cliente
- [ ] Nenhuma server action aceita `userId`/`requesterId` do cliente para autorização
- **Evidência:** `lib/auth-context.tsx:44-135`, `lib/actions/users.ts:147-176`, ausência de `middleware.ts`
- **Cobre:** AUTH-01 🔴

### P1.2 — Autorização por papel no servidor  · Status: ⬜
- [ ] Criar guards `requireAdmin()` / `requireOwner()` a partir da sessão
- [ ] `lib/actions/users.ts:93,127,140` — `saveUser` / `toggleUserActive` / `updateUserPassword` exigem admin
- [ ] `lib/actions/vendedores.ts:84,110` — `saveVendedor` / `toggleVendedorActive` exigem admin
- [ ] `lib/actions/config.ts:78,117` — `updateEmpresa` / `updateAIConfig` exigem admin
- [ ] `lib/actions/creditos.ts:6,49` — `addMovimentacaoCredito` / `getMovimentacoesByCliente` com authz
- [ ] `app/api/formas-pagamento/[id]/route.ts:4,31` — PUT/DELETE exigem auth
- [ ] Teste: chamada direta por não-admin retorna 403/erro
- **Cobre:** AUTHZ-01 🔴, AUTHZ-02 🟠, AUTHZ-03 🟠, AUTHZ-04 🟠, AUTHZ-05 🟡

### P1.3 — Rotacionar e remover segredos versionados  · Status: ⬜
- [ ] **Rotacionar** a senha do banco Neon (está no histórico do git)
- [ ] **Rotacionar** a chave Google Gemini (está no histórico e no bundle do cliente)
- [ ] `git rm --cached .env` e adicionar `.env` ao `.gitignore`
- [ ] Remover chave hardcoded de `app/api/ai/config/route.ts:21`
- [ ] Remover chave hardcoded de `lib/ai-context.tsx:91`
- [ ] Remover chave hardcoded de `diagnostico.cjs:2`
- [ ] (Opcional) Limpar o histórico do git (git filter-repo / BFG)
- **Cobre:** SEC-01 🔴, SEC-02 🔴

---

## Etapa P2 — Isolamento e superfície de exposição

### P2.1 — Filtro de inquilino forçado no servidor  · Status: ⬜
- [ ] `lib/actions/pedidos.ts:47,61-63` — aplicar `vendedorId` da sessão incondicionalmente
- [ ] `lib/actions/orcamentos.ts:34-39` — idem
- [ ] `lib/actions/comissoes.ts:11-16` — idem
- [ ] `lib/actions/dashboard.ts:16-21` — idem
- [ ] `lib/actions/oportunidades.ts:16-21` — idem
- [ ] Remover o caminho "sem filtro" quando não-admin
- [ ] Teste: requisição sem `requesterId` não retorna dados de outros vendedores
- **Cobre:** TEN-01 🔴, TEN-02 🟠

### P2.2 — IDOR: posse por id não bypassável  · Status: ⬜
- [ ] `lib/actions/clientes.ts:115,170` — `getClienteById` / `saveCliente` exigem sessão e escopo
- [ ] `lib/actions/clientes.ts:121-132` — filtrar histórico (orçamentos/pedidos) pelo escopo do usuário
- [ ] `lib/actions/pedidos.ts:213,246,287,346` — posse obrigatória (não dentro de `if`)
- [ ] `lib/actions/orcamentos.ts:181,215,270,287` — posse obrigatória
- [ ] `lib/actions/creditos.ts:49` — `getMovimentacoesByCliente` restrito por escopo
- [ ] Teste: `getPedidoById`/`getOrcamentoById` retornam null para recurso de outro vendedor
- **Cobre:** IDOR-01 🔴, IDOR-02 🟠, IDOR-03 🟠, IDOR-04 🟡

### P2.3 — Chave de IA só no servidor  · Status: ⬜
- [ ] `/api/ai/chat` (`app/api/ai/chat/route.ts:223`) lê a chave de env do servidor, não do corpo
- [ ] Remover `apiKey` do contexto do cliente (`lib/ai-context.tsx:11,91`) e do envio (`components/ai-chat-panel.tsx:116`, `app/oportunidades/page.tsx:133`)
- [ ] Proteger `GET /api/ai/config` com auth e remover `apiKey` da resposta
- **Cobre:** SEC-03 🟠

---

## Etapa P3 — Higiene e endurecimento

### P3.1 — Política de credenciais e validação de startup  · Status: ⬜
- [ ] `lib/actions/users.ts:111` — remover senha padrão `"123456"` (gerar aleatória / convite por link)
- [ ] Forçar troca de senha no primeiro acesso
- [ ] `lib/prisma-db.ts:18` — validar variáveis de ambiente na inicialização, rejeitando defaults inseguros
- **Cobre:** SEC-04 🟡, SEC-05 🔵

### P3.2 — Sanitização de sinks HTML/CSS  · Status: ⬜
- [ ] `app/layout.tsx:62-72` — validar `savedColor` por regex/allowlist (hex ou gradiente permitido) antes de injetar no `<style>`
- [ ] (Preventivo) Adotar lib de sanitização caso surja renderização de HTML/markdown de usuário
- **Cobre:** XSS-01 🔵

---

## Pontos fortes (manter — não regredir)
- ✅ SQL 100% parametrizado (tagged templates Prisma) — sem SQL injection
- ✅ Senhas com bcrypt; hash nunca enviado ao cliente (`login/route.ts:25`, selects excluem `senha`)
- ✅ React escapa a saída; `dangerouslySetInnerHTML` só com conteúdo do desenvolvedor (`components/ui/chart.tsx:83`)
- ✅ Lógica de posse já existe em pedidos/orçamentos (falta torná-la obrigatória — ver P2.2)

---

## Registro de progresso
<!-- Anote aqui datas e decisões conforme avança -->
- 2026-09-04 — Plano criado a partir da auditoria inicial.
