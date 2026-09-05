# -*- coding: utf-8 -*-
"""
Gerador do Relatório de Auditoria de Segurança — App Newflexo.

Uso (a partir da raiz do projeto):
    docs/security-audit/.venv/Scripts/python.exe docs/security-audit/gerar_relatorio.py

Depende de reportlab + matplotlib (instalados no venv em docs/security-audit/.venv).
Gera: docs/security-audit/relatorio-auditoria-seguranca.pdf
"""

import os
import datetime
import textwrap

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, KeepTogether, HRFlowable, Preformatted, ListFlowable, ListItem,
    NextPageTemplate,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

BASE = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(BASE, "relatorio-auditoria-seguranca.pdf")
ASSETS = os.path.join(BASE, "_assets")
os.makedirs(ASSETS, exist_ok=True)

PROJETO = "App Newflexo"
DATA_STR = datetime.date(2026, 9, 1).strftime("%d/%m/%Y")

# ------------------------------------------------------------------ paleta
C_CRITICA   = "#B91C1C"
C_ALTA      = "#EA580C"
C_MEDIA     = "#D97706"
C_BAIXA     = "#2563EB"
C_INFO      = "#64748B"
C_FORTE     = "#059669"
C_TINTA     = "#0f172a"
C_TEXTO     = "#1e293b"
C_SUAVE     = "#475569"
C_LINHA     = "#e2e8f0"
C_FUNDO_HED = "#0f264a"

SEV_COR = {
    "Crítica": C_CRITICA,
    "Alta": C_ALTA,
    "Média": C_MEDIA,
    "Baixa": C_BAIXA,
    "Informativa": C_INFO,
    "Ponto forte": C_FORTE,
}
SEV_ORDEM = ["Crítica", "Alta", "Média", "Baixa", "Informativa"]

# ------------------------------------------------------------------ dados: achados
# Cada achado: id, categoria, severidade, arquivo, linha, titulo, descricao, impacto
ACHADOS = [
    # ---- Categoria 2 (raiz) — autenticação
    dict(id="AUTH-01", cat="2. Permissão no navegador", sev="Crítica",
         arq="lib/actions/users.ts", linha="147-176 / lib/auth-context.tsx:44-135",
         titulo="Sessão inteiramente no cliente — servidor confia no userId enviado",
         desc="Não há sessão no servidor (sem cookie assinado, sem token, sem middleware). "
              "A sessão vive em localStorage ('flexo_session') e a autenticação se resume a "
              "verifySession(userId) recebendo um userId escolhido pelo cliente. Qualquer pessoa "
              "pode gravar {userId: <id de um admin>} no localStorage, ou chamar as server actions "
              "diretamente, e ser tratada como aquele usuário.",
         imp="Bypass total de autenticação e de papéis. É a causa-raiz que torna exploráveis os "
             "achados de isolamento (cat.1), autorização (cat.2) e IDOR (cat.3)."),
    dict(id="AUTHZ-01", cat="2. Permissão no navegador", sev="Crítica",
         arq="lib/actions/users.ts", linha="93, 127, 140",
         titulo="Gestão de usuários sem verificação de papel no servidor",
         desc="saveUser (93), toggleUserActive (127) e updateUserPassword (140) não checam se quem "
              "chama é admin. A tela app/usuarios/page.tsx:80 esconde a UI com 'if (!isAdmin)', mas a "
              "server action é um endpoint POST invocável diretamente. Um vendedor (ou anônimo) pode "
              "criar um usuário com role:'admin' ou redefinir a senha de qualquer conta.",
         imp="Escalada de privilégio para admin e tomada de conta (account takeover) de qualquer usuário."),
    dict(id="AUTHZ-02", cat="2. Permissão no navegador", sev="Alta",
         arq="lib/actions/vendedores.ts", linha="84, 110",
         titulo="Gestão de vendedores sem verificação de papel",
         desc="saveVendedor (84) e toggleVendedorActive (110) não validam admin. UI protegida só em "
              "app/vendedores/page.tsx:64.",
         imp="Criação/edição/inativação de vendedores por não-admin; adulteração de comissões (%)."),
    dict(id="AUTHZ-03", cat="2. Permissão no navegador", sev="Alta",
         arq="lib/actions/config.ts", linha="78, 117",
         titulo="Configuração da empresa e do módulo IA sem verificação de papel",
         desc="updateEmpresa (78) e updateAIConfig (117) sem checagem de admin. UI protegida só em "
              "app/configuracoes/page.tsx:139.",
         imp="Alteração de dados fiscais/cadastrais da empresa e da chave/limite de IA por não-admin."),
    dict(id="AUTHZ-04", cat="2. Permissão no navegador", sev="Alta",
         arq="lib/actions/creditos.ts", linha="6, 49",
         titulo="Movimentação de crédito financeiro sem autorização",
         desc="addMovimentacaoCredito (6) credita/debita saldo em R$ e em etiquetas de qualquer cliente "
              "sem verificar quem chama nem vínculo. getMovimentacoesByCliente (49) idem para leitura.",
         imp="Fraude financeira: crédito arbitrário para clientes; leitura do histórico financeiro alheio."),
    dict(id="AUTHZ-05", cat="2. Permissão no navegador", sev="Média",
         arq="app/api/formas-pagamento/[id]/route.ts", linha="4 (PUT), 31 (DELETE)",
         titulo="Rota REST de formas de pagamento sem autenticação",
         desc="PUT e DELETE alteram/excluem formas de pagamento por id sem qualquer auth. UI protegida "
              "só em app/formas-pagamento/page.tsx:149.",
         imp="Adulteração de condições de pagamento (parcelas) e exclusão de registros por qualquer um."),

    # ---- Categoria 1 — isolamento de inquilino (vendedor)
    dict(id="TEN-01", cat="1. Banco sem tranca (isolamento)", sev="Crítica",
         arq="lib/actions/pedidos.ts", linha="47, 61-63",
         titulo="Filtro de isolamento por vendedor é opcional e controlado pelo cliente",
         desc="O isolamento é um filtro manual por vendedorId derivado de getRequesterVendedorId(requesterId). "
              "Mas requesterId é opcional ('if (requesterId)'/'if (params.requesterId)') e vem do cliente. "
              "Omitindo requesterId, perm=null e nenhum filtro de vendedor é aplicado — retorna dados de "
              "TODOS os vendedores. Mesmo enviado, é o id que o cliente afirma ter (localStorage), falsificável. "
              "Mesmo padrão em getOrcamentos (orcamentos.ts:34-39), getOportunidadesData (oportunidades.ts:16-21), "
              "getComissoes (comissoes.ts:11-16) e getDashboardMetrics (dashboard.ts:16-21).",
         imp="Vendedor (ou anônimo) enxerga pedidos, orçamentos, comissões e faturamento de toda a empresa."),
    dict(id="TEN-02", cat="1. Banco sem tranca (isolamento)", sev="Alta",
         arq="lib/actions/clientes.ts", linha="115-149",
         titulo="Ficha do cliente expõe histórico de todos os vendedores",
         desc="getClienteById não recebe requesterId e retorna, além do cadastro, todos os orçamentos "
              "(121-126) e pedidos (127-132) do cliente, sem filtrar por vendedor.",
         imp="Vazamento cruzado de negociações/valores entre vendedores concorrentes."),

    # ---- Categoria 3 — IDOR
    dict(id="IDOR-01", cat="3. IDOR", sev="Crítica",
         arq="lib/actions/clientes.ts", linha="115, 170",
         titulo="Leitura e escrita de cliente por id sem verificação de posse",
         desc="getClienteById(id) (115) devolve o cadastro completo, saldos de crédito e itens exclusivos de "
              "qualquer id. saveCliente(data) (170) atualiza qualquer cliente por id sem checagem.",
         imp="Enumeração de toda a base de clientes e alteração de qualquer cadastro."),
    dict(id="IDOR-02", cat="3. IDOR", sev="Alta",
         arq="lib/actions/pedidos.ts", linha="213, 246, 287, 346",
         titulo="Pedido por id: verificação de posse é bypassável",
         desc="getPedidoById (213), updatePedidoStatus (246), cancelarPedido (287) e savePedido (346) só "
              "checam posse dentro de 'if (requesterId)'. Omitindo requesterId, a checagem inteira é pulada "
              "e qualquer pedido pode ser lido, alterado ou cancelado.",
         imp="Acesso e manipulação de pedidos de outros vendedores (status, cancelamento, edição)."),
    dict(id="IDOR-03", cat="3. IDOR", sev="Alta",
         arq="lib/actions/orcamentos.ts", linha="181, 215, 270, 287",
         titulo="Orçamento por id: verificação de posse é bypassável",
         desc="getOrcamentoById (181), updateOrcamentoStatus (215), deleteOrcamento (270) e saveOrcamento (287) "
              "seguem o mesmo padrão opt-in de requesterId — some quando o parâmetro não é enviado.",
         imp="Leitura, alteração de status e exclusão lógica de orçamentos alheios."),
    dict(id="IDOR-04", cat="3. IDOR", sev="Média",
         arq="lib/actions/creditos.ts", linha="49 / app/api/formas-pagamento/[id]/route.ts:31",
         titulo="Outros acessos por id sem posse (crédito e forma de pagamento)",
         desc="getMovimentacoesByCliente(clienteId) (49) e o DELETE de formas de pagamento operam por id sem "
              "qualquer verificação de contexto do chamador.",
         imp="Leitura de extrato financeiro por cliente e remoção de registros por id arbitrário."),

    # ---- Categoria 4 — segredos
    dict(id="SEC-01", cat="4. Chaves expostas", sev="Crítica",
         arq=".env", linha="1",
         titulo="Credenciais do banco (Neon Postgres) versionadas no git",
         desc="DB_URL_OFFICIAL contém usuário e senha reais (npg_...). O arquivo .env está rastreado no git "
              "(git ls-files confirma) e presente no histórico (commit 3c300a2, então como DATABASE_URL). O "
              ".gitignore ignora '.env*.local', mas não '.env'.",
         imp="Quem tiver acesso ao repositório obtém acesso direto de leitura/escrita ao banco de produção."),
    dict(id="SEC-02", cat="4. Chaves expostas", sev="Crítica",
         arq="app/api/ai/config/route.ts", linha="21",
         titulo="Chave da API Google Gemini hardcoded e exposta ao público",
         desc="A chave 'AIzaSy...' está fixa em três pontos: app/api/ai/config/route.ts:21 (servida por GET "
              "/api/ai/config SEM autenticação), lib/ai-context.tsx:91 (arquivo 'use client', vai no bundle "
              "do navegador) e diagnostico.cjs:2. Também aparece no histórico do git (commits 3c300a2, 16a5416).",
         imp="Qualquer visitante lê a chave (via endpoint ou bundle JS) e a usa por conta do titular (custo/abuso)."),
    dict(id="SEC-03", cat="4. Chaves expostas", sev="Alta",
         arq="lib/ai-context.tsx", linha="11, 91 / lib/actions/config.ts:97",
         titulo="Chave de IA trafega até o navegador por design",
         desc="A config de IA (incluindo apiKey) é carregada no cliente, guardada em localStorage e reenviada "
              "do navegador para /api/ai/chat no corpo da requisição. Chaves de provedores deveriam permanecer "
              "apenas no servidor.",
         imp="Exposição contínua da chave a qualquer usuário logado, mesmo sem os hardcodes."),
    dict(id="SEC-04", cat="4. Chaves expostas", sev="Média",
         arq="lib/actions/users.ts", linha="111",
         titulo="Senha padrão fraca e previsível para novos usuários",
         desc="Ao criar usuário sem senha, aplica-se bcrypt.hash('123456'). Não há troca obrigatória no "
              "primeiro acesso.",
         imp="Contas recém-criadas ficam com credencial conhecida até o usuário trocar (se trocar)."),
    dict(id="SEC-05", cat="4. Chaves expostas", sev="Baixa",
         arq="lib/prisma-db.ts", linha="18",
         titulo="Ausência de validação de segredos no startup",
         desc="connectionString cai em fallback silencioso (DB_URL_OFFICIAL || DATABASE_URL) e nada rejeita "
              "segredos ausentes/padrão na inicialização.",
         imp="Falhas de configuração passam despercebidas; defaults inseguros podem ir a produção."),

    # ---- Categoria 5 — XSS
    dict(id="XSS-01", cat="5. Inputs sem tratamento (XSS)", sev="Baixa",
         arq="app/layout.tsx", linha="71",
         titulo="Injeção de CSS via valor de localStorage sem validação",
         desc="No ramo de gradiente, savedColor (localStorage 'flexo_theme_sidebar') é concatenado direto em "
              "style.innerHTML de um <style>. O ramo '#' usa setProperty (seguro); o de gradiente não valida. "
              "Explorável apenas se o atacante já controla o localStorage da vítima (XSS prévio ou acesso local).",
         imp="Injeção de CSS/estilo; risco baixo por depender de controle prévio do armazenamento local."),
]

# ------------------------------------------------------------------ pontos fortes
FORTES = [
    ("SQL parametrizado em todo o código",
     "Todo o SQL bruto usa tagged templates do Prisma (prisma.$queryRaw`...`) e Prisma.sql/Prisma.join. "
     "Valores entram como parâmetros ($1, $2...), não por concatenação. Não foi encontrada injeção de SQL "
     "mesmo com uso intenso de raw SQL (ex.: clientes.ts, pedidos.ts, dashboard.ts)."),
    ("Senhas com hash bcrypt e nunca trafegadas",
     "Login usa bcrypt.compare (app/api/auth/login/route.ts:25) e o cadastro usa bcrypt.hash. As leituras que "
     "vão ao cliente excluem o campo 'senha' via select (users.ts:68-73, verifySession users.ts:151-155)."),
    ("Escapamento automático do React nas telas",
     "A saída da IA e os dados do banco são renderizados como texto JSX (React escapa por padrão). Só há dois "
     "usos de dangerouslySetInnerHTML no projeto."),
    ("Uso de dangerouslySetInnerHTML controlado pelo desenvolvedor",
     "Em components/ui/chart.tsx:83 o HTML injetado é CSS gerado a partir da config de cores do próprio código "
     "(não entra input do usuário) — uso correto do componente de gráfico."),
    ("Checagem de posse já existe (parcial) em pedidos e orçamentos",
     "getPedidoById/getOrcamentoById e as escritas comparam vendedorId com a permissão do requisitante. A "
     "lógica está correta; o problema é ela ser opcional/bypassável, não inexistente."),
]

# ------------------------------------------------------------------ recomendações priorizadas
RECS = [
    ("P1", "Implementar sessão real no servidor",
     "Trocar a sessão em localStorage por cookie httpOnly assinado (ou JWT verificado no servidor). "
     "Derivar SEMPRE o usuário/vendedor da sessão do servidor — nunca de um requesterId enviado pelo cliente. "
     "Adicionar middleware.ts protegendo rotas e server actions. (AUTH-01, TEN-01, IDOR-02/03)"),
    ("P1", "Autorização por papel no servidor em toda operação sensível",
     "Criar um guard requireAdmin()/requireOwner() aplicado no início de saveUser, toggleUserActive, "
     "updateUserPassword, saveVendedor, updateEmpresa, updateAIConfig, addMovimentacaoCredito e nas rotas "
     "de formas de pagamento. (AUTHZ-01..05)"),
    ("P1", "Rotacionar e remover segredos versionados",
     "Rotacionar imediatamente a senha do banco Neon e a chave Gemini (estão no histórico do git). Remover .env "
     "do controle de versão (git rm --cached .env) e adicioná-lo ao .gitignore. Excluir a chave hardcoded de "
     "route.ts, ai-context.tsx e diagnostico.cjs. (SEC-01, SEC-02)"),
    ("P2", "Manter a chave de IA apenas no servidor",
     "O endpoint /api/ai/chat deve ler a chave do ambiente/servidor; nunca retornar apiKey ao cliente nem "
     "recebê-la do corpo. Proteger GET /api/ai/config com auth e remover a apiKey da resposta. (SEC-03)"),
    ("P2", "Forçar filtro de inquilino no servidor (não opcional)",
     "Aplicar o filtro por vendedorId a partir da sessão em getPedidos, getOrcamentos, getComissoes, "
     "getDashboardMetrics, getOportunidadesData, getClienteById/getClientes — sem depender de parâmetro do "
     "cliente. (TEN-01, TEN-02, IDOR-01)"),
    ("P3", "Política de credenciais e validação de startup",
     "Remover a senha padrão '123456' (gerar aleatória + troca obrigatória no 1º acesso) e validar variáveis de "
     "ambiente na inicialização, rejeitando defaults inseguros. (SEC-04, SEC-05)"),
    ("P3", "Sanitizar/validar entradas em sinks de HTML/CSS",
     "Validar savedColor contra um padrão seguro (hex/gradiente permitido) antes de injetar no <style>. "
     "Adotar uma lib de sanitização caso surja renderização de HTML/markdown. (XSS-01)"),
]

# ------------------------------------------------------------------ issues do GitHub
ISSUES = [
    dict(titulo="[Segurança] Implementar sessão/autenticação no servidor (fim do requesterId enviado pelo cliente)",
         labels="security, critical",
         problema="A aplicação não tem sessão no servidor. A identidade vem de localStorage e de um userId/requesterId "
                  "enviado pelo cliente; verifySession(userId) confia nesse id. Isso permite se passar por qualquer "
                  "usuário e é a causa-raiz dos problemas de isolamento, autorização e IDOR.",
         evidencia="lib/auth-context.tsx:44-135 (sessão em localStorage)\nlib/actions/users.ts:147-176 (verifySession recebe userId do cliente)\nAusência de middleware.ts no projeto",
         impacto="Bypass total de autenticação e de papéis; base para escalonamento de privilégio e vazamento entre inquilinos.",
         correcao="Adotar cookie httpOnly assinado (ou JWT verificado). Derivar usuário/papel/vendedor SEMPRE da sessão do "
                  "servidor. Criar middleware.ts protegendo páginas e um helper getSessionUser() usado pelas server actions.",
         aceite=["Sessão emitida em cookie httpOnly + Secure + SameSite",
                 "Nenhuma server action aceita userId/requesterId do cliente para autorização",
                 "middleware.ts redireciona não autenticados",
                 "verifySession não recebe mais o id pelo cliente"]),
    dict(titulo="[Segurança] Verificação de papel (admin/owner) no servidor para operações privilegiadas",
         labels="security, critical",
         problema="Operações administrativas e de escrita são protegidas apenas escondendo a UI (isAdmin) no frontend. "
                  "As server actions correspondentes não validam papel e são invocáveis diretamente.",
         evidencia="lib/actions/users.ts:93,127,140 (saveUser/toggleUserActive/updateUserPassword)\n"
                   "lib/actions/vendedores.ts:84,110\nlib/actions/config.ts:78,117\nlib/actions/creditos.ts:6,49\n"
                   "app/api/formas-pagamento/[id]/route.ts:4,31\nGates de UI: app/usuarios/page.tsx:80, "
                   "app/configuracoes/page.tsx:139, app/vendedores/page.tsx:64, app/formas-pagamento/page.tsx:149",
         impacto="Não-admin cria admin, redefine senhas (account takeover), altera comissões, config da empresa e crédito financeiro.",
         correcao="Implementar requireAdmin() e requireOwner() a partir da sessão do servidor e aplicá-los no início de cada "
                  "operação sensível listada.",
         aceite=["Toda action de gestão chama requireAdmin() antes de qualquer escrita",
                 "Operações por dono validam vínculo do recurso com o usuário da sessão",
                 "Testes cobrindo chamada direta por não-admin retornando 403/erro"]),
    dict(titulo="[Segurança] Isolamento de inquilino (vendedor) forçado no servidor e não bypassável",
         labels="security, critical",
         problema="O filtro por vendedorId é opcional e depende de requesterId enviado pelo cliente. Sem esse parâmetro, "
                  "listas e agregações retornam dados de todos os vendedores. Nas leituras/escritas por id de pedidos e "
                  "orçamentos, a checagem de posse também some quando requesterId não é enviado.",
         evidencia="lib/actions/pedidos.ts:47,61-63,213,246,287,346\nlib/actions/orcamentos.ts:34-39,181,215,270,287\n"
                   "lib/actions/comissoes.ts:11-16\nlib/actions/dashboard.ts:16-21\nlib/actions/oportunidades.ts:16-21",
         impacto="Vendedor ou anônimo vê/edita pedidos, orçamentos, comissões e faturamento de toda a empresa.",
         correcao="Derivar o vendedorId da sessão e aplicá-lo incondicionalmente. Remover o caminho 'sem filtro' quando "
                  "não-admin. A checagem de posse deixa de depender de parâmetro opcional.",
         aceite=["Filtro por vendedorId aplicado a partir da sessão, sem parâmetro do cliente",
                 "Requisição sem 'requesterId' não retorna dados de outros vendedores",
                 "getPedidoById/getOrcamentoById retornam null para recurso de outro vendedor sempre"]),
    dict(titulo="[Segurança] IDOR na base de clientes (leitura/escrita por id sem posse)",
         labels="security, high",
         problema="Funções de cliente operam por id sem verificar contexto do chamador. getClienteById devolve cadastro, "
                  "saldos e todo o histórico (inclusive de outros vendedores); saveCliente edita qualquer cliente.",
         evidencia="lib/actions/clientes.ts:115-149 (getClienteById + orçamentos/pedidos)\nlib/actions/clientes.ts:170 (saveCliente)\n"
                   "lib/actions/creditos.ts:49 (getMovimentacoesByCliente)",
         impacto="Enumeração completa da base de clientes, leitura de dados financeiros e alteração de cadastros.",
         correcao="Exigir sessão e aplicar regra de acesso (admin vê tudo; vendedor só clientes com relação a ele). Filtrar "
                  "o histórico retornado pelo escopo do usuário.",
         aceite=["getClienteById exige sessão e restringe histórico ao escopo do usuário",
                 "saveCliente valida permissão antes de gravar",
                 "getMovimentacoesByCliente restrito por escopo"]),
    dict(titulo="[Segurança] Segredos versionados: credenciais do banco e chave da API Gemini",
         labels="security, critical",
         problema="A senha do banco Neon está em .env versionado e a chave Gemini está hardcoded em três arquivos — um deles "
                  "servido por GET sem auth e outro no bundle do cliente. Ambos aparecem no histórico do git.",
         evidencia=".env:1 (DB_URL_OFFICIAL com senha real; .env rastreado no git)\napp/api/ai/config/route.ts:21 (chave via GET público)\n"
                   "lib/ai-context.tsx:91 ('use client' → bundle)\ndiagnostico.cjs:2\nHistórico: commits 3c300a2, 16a5416",
         impacto="Acesso direto ao banco de produção e uso indevido da chave de IA por terceiros.",
         correcao="Rotacionar senha do banco e chave Gemini. git rm --cached .env e adicionar ao .gitignore. Remover a chave "
                  "dos três arquivos. Considerar limpeza do histórico (filter-repo/BFG). Chave de IA só no servidor.",
         aceite=["Senha do banco e chave Gemini rotacionadas",
                 ".env fora do versionamento e no .gitignore",
                 "Nenhuma chave hardcoded no código ou no bundle do cliente",
                 "GET /api/ai/config protegido e sem apiKey na resposta"]),
    dict(titulo="[Segurança] Chave de IA deixa de trafegar até o navegador",
         labels="security, high",
         problema="A configuração de IA (com apiKey) é carregada no cliente, salva em localStorage e reenviada do navegador "
                  "para /api/ai/chat no corpo da requisição.",
         evidencia="lib/ai-context.tsx:11,91\nlib/actions/config.ts:97-138\napp/api/ai/chat/route.ts:223 (apiKey vem do body)\n"
                   "components/ai-chat-panel.tsx:116 / app/oportunidades/page.tsx:133 (envio pelo cliente)",
         impacto="Exposição contínua da chave a qualquer usuário do app, mesmo após remover os hardcodes.",
         correcao="/api/ai/chat lê a chave de variável de ambiente no servidor; remover apiKey do contexto do cliente e do body.",
         aceite=["apiKey nunca é enviada ao cliente nem recebida no body",
                 "Chamadas de IA usam chave do ambiente do servidor"]),
    dict(titulo="[Segurança] Senha padrão fraca para novos usuários",
         labels="security, medium",
         problema="Novos usuários sem senha recebem '123456' e não há troca obrigatória no primeiro acesso.",
         evidencia="lib/actions/users.ts:111 (bcrypt.hash('123456'))",
         impacto="Contas novas ficam com credencial previsível até (e se) o usuário trocar.",
         correcao="Gerar senha aleatória forte e exigir redefinição no primeiro login; nunca usar constante.",
         aceite=["Novo usuário recebe senha aleatória (ou convite por link)",
                 "Flag de troca obrigatória no primeiro acesso"]),
    dict(titulo="[Segurança] Injeção de CSS via valor de tema em localStorage",
         labels="security, low",
         problema="No ramo de gradiente, savedColor de localStorage é concatenado sem validação em style.innerHTML.",
         evidencia="app/layout.tsx:62-72 (ramo gradiente concatena savedColor em <style>.innerHTML)",
         impacto="Injeção de CSS; risco baixo por exigir controle prévio do localStorage da vítima.",
         correcao="Validar savedColor contra um padrão permitido (hex ou gradiente conhecido) antes de aplicar.",
         aceite=["savedColor validado por regex/allowlist antes de injetar",
                 "Valores inválidos são ignorados com fallback seguro"]),
]

# ================================================================== gráficos
def _pt_font():
    for name in ("DejaVu Sans", "Arial", "Segoe UI"):
        try:
            font_manager.findfont(name, fallback_to_default=False)
            return name
        except Exception:
            continue
    return "DejaVu Sans"

plt.rcParams["font.family"] = _pt_font()

def grafico_rosca(path):
    counts = {s: 0 for s in SEV_ORDEM}
    for a in ACHADOS:
        counts[a["sev"]] += 1
    labels = [s for s in SEV_ORDEM if counts[s] > 0]
    vals = [counts[s] for s in labels]
    cols = [SEV_COR[s] for s in labels]

    fig, ax = plt.subplots(figsize=(4.6, 3.4), dpi=200)
    wedges, _ = ax.pie(vals, colors=cols, startangle=90,
                       wedgeprops=dict(width=0.42, edgecolor="white", linewidth=2))
    total = sum(vals)
    ax.text(0, 0, f"{total}\nachados", ha="center", va="center",
            fontsize=15, fontweight="bold", color=C_TINTA)
    ax.legend(wedges, [f"{l}  ({v})" for l, v in zip(labels, vals)],
              loc="center left", bbox_to_anchor=(1.0, 0.5), frameon=False, fontsize=9)
    ax.set(aspect="equal")
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight", transparent=True)
    plt.close(fig)

def grafico_barras(path):
    cats_order = [
        "1. Banco sem tranca (isolamento)",
        "2. Permissão no navegador",
        "3. IDOR",
        "4. Chaves expostas",
        "5. Inputs sem tratamento (XSS)",
    ]
    labels_curto = ["1. Isolamento", "2. Autorização", "3. IDOR", "4. Segredos", "5. XSS"]
    counts = []
    for c in cats_order:
        counts.append(sum(1 for a in ACHADOS if a["cat"] == c))

    fig, ax = plt.subplots(figsize=(6.2, 3.2), dpi=200)
    bars = ax.bar(labels_curto, counts, color=C_FUNDO_HED, width=0.62)
    for b, v in zip(bars, counts):
        ax.text(b.get_x() + b.get_width() / 2, v + 0.08, str(v),
                ha="center", va="bottom", fontsize=11, fontweight="bold", color=C_TINTA)
    ax.set_ylim(0, max(counts) + 1)
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["left", "bottom"]].set_color(C_LINHA)
    ax.tick_params(axis="x", labelsize=9, colors=C_TEXTO, length=0)
    ax.tick_params(axis="y", labelsize=8, colors=C_SUAVE)
    ax.set_axisbelow(True)
    ax.yaxis.grid(True, color=C_LINHA, linewidth=0.7)
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight", transparent=True)
    plt.close(fig)

ROSCA = os.path.join(ASSETS, "rosca.png")
BARRAS = os.path.join(ASSETS, "barras.png")
grafico_rosca(ROSCA)
grafico_barras(BARRAS)

# ================================================================== estilos
styles = getSampleStyleSheet()

def S(name, **kw):
    styles.add(ParagraphStyle(name, **kw))

S("Capa1", fontName="Helvetica-Bold", fontSize=26, leading=31, textColor=colors.white, alignment=TA_LEFT)
S("CapaSub", fontName="Helvetica", fontSize=13, leading=18, textColor=colors.HexColor("#cbd5e1"), alignment=TA_LEFT)
S("CapaMeta", fontName="Helvetica", fontSize=10.5, leading=16, textColor=colors.HexColor("#e2e8f0"))
S("H1", fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=colors.HexColor(C_FUNDO_HED),
  spaceBefore=6, spaceAfter=8)
S("H2", fontName="Helvetica-Bold", fontSize=12.5, leading=16, textColor=colors.HexColor(C_TINTA),
  spaceBefore=10, spaceAfter=5)
S("Body", fontName="Helvetica", fontSize=9.6, leading=13.6, textColor=colors.HexColor(C_TEXTO),
  alignment=TA_JUSTIFY)
S("BodyC", fontName="Helvetica", fontSize=9.6, leading=13.6, textColor=colors.HexColor(C_TEXTO))
S("Small", fontName="Helvetica", fontSize=8.4, leading=11.5, textColor=colors.HexColor(C_SUAVE))
S("Cell", fontName="Helvetica", fontSize=8.3, leading=10.8, textColor=colors.HexColor(C_TEXTO))
S("CellB", fontName="Helvetica-Bold", fontSize=8.3, leading=10.8, textColor=colors.HexColor(C_TINTA))
S("Mono", fontName="Courier", fontSize=7.8, leading=10, textColor=colors.HexColor("#334155"))
S("Chip", fontName="Helvetica-Bold", fontSize=8, leading=9, textColor=colors.white, alignment=TA_CENTER)
S("IssueH", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=colors.HexColor(C_FUNDO_HED),
  spaceBefore=4, spaceAfter=3)

def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))

def chip(sev):
    return Table([[Paragraph(sev, styles["Chip"])]], colWidths=[2.3*cm],
                 style=TableStyle([
                     ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(SEV_COR[sev])),
                     ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                     ("TOPPADDING", (0, 0), (-1, -1), 3),
                     ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                     ("ROUNDEDCORNERS", [3, 3, 3, 3]),
                 ]))

# ================================================================== layout do documento
def header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    # cabeçalho
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor(C_SUAVE))
    canvas.drawString(2*cm, h - 1.15*cm, "Relatório de Auditoria de Segurança — %s" % PROJETO)
    canvas.setStrokeColor(colors.HexColor(C_LINHA))
    canvas.setLineWidth(0.5)
    canvas.line(2*cm, h - 1.3*cm, w - 2*cm, h - 1.3*cm)
    # rodapé
    canvas.line(2*cm, 1.35*cm, w - 2*cm, 1.35*cm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor(C_SUAVE))
    canvas.drawString(2*cm, 1.0*cm, "Confidencial · %s" % DATA_STR)
    canvas.drawRightString(w - 2*cm, 1.0*cm, "Página %d" % doc.page)
    canvas.restoreState()

def cover(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(colors.HexColor(C_FUNDO_HED))
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#B91C1C"))
    canvas.rect(0, h - 0.55*cm, w, 0.55*cm, fill=1, stroke=0)
    canvas.restoreState()

doc = BaseDocTemplate(
    PDF_PATH, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=1.8*cm,
    title="Relatório de Auditoria de Segurança — %s" % PROJETO,
    author="Auditoria de Segurança",
)
frame_capa = Frame(2*cm, 2*cm, A4[0]-4*cm, A4[1]-4*cm, id="capa")
frame_corpo = Frame(2*cm, 1.6*cm, A4[0]-4*cm, A4[1]-3.2*cm, id="corpo")
doc.addPageTemplates([
    PageTemplate(id="Capa", frames=[frame_capa], onPage=cover),
    PageTemplate(id="Corpo", frames=[frame_corpo], onPage=header_footer),
])

story = []

# ---------------- CAPA
story.append(NextPageTemplate("Corpo"))
story.append(Spacer(1, 3.2*cm))
story.append(Paragraph("Relatório de Auditoria<br/>de Segurança", styles["Capa1"]))
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph(PROJETO, styles["CapaSub"]))
story.append(Spacer(1, 2.6*cm))
meta = [
    ["Data:", DATA_STR],
    ["Escopo:", "Aplicação Next.js (App Router), server actions e rotas /api, camada Prisma/Postgres, frontend React."],
    ["Stack:", "Next.js 16 · React 19 · Prisma 7 + adapter-pg (Neon Postgres) · bcryptjs · Zod · TailwindCSS."],
]
t = Table([[Paragraph("<b>%s</b>" % k, styles["CapaMeta"]), Paragraph(v, styles["CapaMeta"])] for k, v in meta],
          colWidths=[2.4*cm, 12.6*cm])
t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
story.append(t)
story.append(Spacer(1, 1.2*cm))
story.append(Paragraph(
    "<b>Nota metodológica.</b> As cinco categorias solicitadas foram mapeadas para esta stack assim: "
    "(1) <i>Isolamento de inquilino</i> → o projeto não usa RLS; o isolamento é um filtro manual por "
    "<i>vendedorId</i> resolvido em getRequesterVendedorId — avaliou-se onde ele falta ou é contornável. "
    "(2) <i>Permissão no navegador</i> → cruzamento dos gates de UI (isAdmin) com a checagem equivalente nas "
    "server actions/rotas. (3) <i>IDOR</i> → varredura de todos os handlers que operam por id. "
    "(4) <i>Chaves expostas</i> → código, .env, scripts e histórico do git. (5) <i>XSS</i> → sinks "
    "dangerouslySetInnerHTML/innerHTML e renderização de conteúdo. Foram reportados apenas achados verificados "
    "no código real, com arquivo e linha.",
    styles["CapaMeta"]))
story.append(PageBreak())

# ---------------- RESUMO EXECUTIVO
story.append(Paragraph("1. Resumo executivo", styles["H1"]))
story.append(Paragraph(
    "A auditoria identificou <b>%d achados</b>. O ponto central é arquitetural: <b>a aplicação não mantém "
    "sessão no servidor</b> — a identidade e o papel do usuário vêm do cliente (localStorage e um "
    "<i>requesterId</i> passado às server actions). Como consequência, os controles de isolamento por vendedor "
    "e as checagens de posse, embora existam no código, são <b>opcionais e falsificáveis</b>. Somam-se a isso "
    "operações administrativas sem verificação de papel no servidor e segredos reais (banco e chave de IA) "
    "versionados no git." % len(ACHADOS),
    styles["Body"]))
story.append(Spacer(1, 0.3*cm))

# contagem por severidade
counts = {s: 0 for s in SEV_ORDEM}
for a in ACHADOS:
    counts[a["sev"]] += 1
kpi_cells = []
for s in SEV_ORDEM:
    kpi_cells.append(Table(
        [[Paragraph(str(counts[s]), ParagraphStyle("n", fontName="Helvetica-Bold", fontSize=18,
                                                    textColor=colors.white, alignment=TA_CENTER))],
         [Paragraph(s, ParagraphStyle("l", fontName="Helvetica-Bold", fontSize=7.5,
                                      textColor=colors.white, alignment=TA_CENTER))]],
        colWidths=[2.7*cm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(SEV_COR[s])),
            ("TOPPADDING", (0, 0), (-1, 0), 7), ("BOTTOMPADDING", (0, 1), (-1, 1), 6),
            ("TOPPADDING", (0, 1), (-1, 1), 0),
        ])))
kpi_row = Table([kpi_cells], colWidths=[2.9*cm]*len(SEV_ORDEM))
kpi_row.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                             ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
story.append(kpi_row)
story.append(Spacer(1, 0.5*cm))

# gráficos lado a lado
g1 = Image(ROSCA, width=8.0*cm, height=5.9*cm)
g2 = Image(BARRAS, width=8.6*cm, height=4.6*cm)
gtable = Table([[
    [Paragraph("Distribuição por severidade", styles["H2"]), g1],
    [Paragraph("Achados por categoria", styles["H2"]), g2],
]], colWidths=[8.4*cm, 8.6*cm])
gtable.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
story.append(gtable)
story.append(PageBreak())

# ---------------- PONTOS FORTES / FRACOS
story.append(Paragraph("2. Pontos fortes e pontos fracos", styles["H1"]))
story.append(Paragraph("2.1. Pontos fortes (o que está protegido)", styles["H2"]))
for tit, txt in FORTES:
    story.append(Paragraph("<font color='%s'>&#9679;</font> <b>%s.</b> %s" % (C_FORTE, esc(tit), esc(txt)), styles["Body"]))
    story.append(Spacer(1, 0.12*cm))

story.append(Spacer(1, 0.2*cm))
story.append(Paragraph("2.2. Pontos fracos (riscos centrais)", styles["H2"]))
fracos = [
    ("Sem sessão no servidor", "A confiança recai sobre dados do cliente (localStorage/requesterId). Raiz dos demais riscos."),
    ("Autorização só no frontend", "Operações de admin e escrita não revalidam papel no servidor."),
    ("Isolamento contornável", "O filtro por vendedor é opcional; some quando o parâmetro não é enviado."),
    ("Segredos no repositório", "Credenciais do banco e chave de IA versionadas e no histórico do git."),
]
for tit, txt in fracos:
    story.append(Paragraph("<font color='%s'>&#9679;</font> <b>%s.</b> %s" % (C_CRITICA, esc(tit), esc(txt)), styles["Body"]))
    story.append(Spacer(1, 0.12*cm))
story.append(PageBreak())

# ---------------- TABELA DE ACHADOS POR CATEGORIA
story.append(Paragraph("3. Achados detalhados por categoria", styles["H1"]))

CATS = [
    "1. Banco sem tranca (isolamento)",
    "2. Permissão no navegador",
    "3. IDOR",
    "4. Chaves expostas",
    "5. Inputs sem tratamento (XSS)",
]

def sev_key(a):
    return SEV_ORDEM.index(a["sev"])

for cat in CATS:
    itens = sorted([a for a in ACHADOS if a["cat"] == cat], key=sev_key)
    bloco = [Paragraph(cat, styles["H2"])]
    if not itens:
        bloco.append(Paragraph("Nenhum achado nesta categoria.", styles["Small"]))
        story.append(KeepTogether(bloco))
        continue

    header = [
        Paragraph("Sev.", styles["CellB"]),
        Paragraph("Arquivo : linha", styles["CellB"]),
        Paragraph("Descrição", styles["CellB"]),
    ]
    rows = [header]
    span_rows = []
    for a in itens:
        rows.append([
            chip(a["sev"]),
            Paragraph("<b>%s</b><br/><font size=7 color='%s'>%s</font>" % (esc(a["arq"]), C_SUAVE, esc(a["linha"])),
                      styles["Cell"]),
            Paragraph("<b>[%s] %s.</b> %s <i>Impacto:</i> %s" %
                      (esc(a["id"]), esc(a["titulo"]), esc(a["desc"]), esc(a["imp"])), styles["Cell"]),
        ])
    tbl = Table(rows, colWidths=[2.5*cm, 4.1*cm, 10.4*cm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.HexColor(C_FUNDO_HED)),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor(C_LINHA)),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    bloco.append(tbl)
    bloco.append(Spacer(1, 0.35*cm))
    story.append(KeepTogether(bloco) if len(itens) <= 2 else Spacer(1, 0))
    if len(itens) > 2:
        for b in bloco:
            story.append(b)

story.append(PageBreak())

# ---------------- RECOMENDAÇÕES
story.append(Paragraph("4. Recomendações priorizadas", styles["H1"]))
prio_cor = {"P1": C_CRITICA, "P2": C_ALTA, "P3": C_MEDIA}
rows = [[Paragraph("Prio.", styles["CellB"]), Paragraph("Ação", styles["CellB"]),
         Paragraph("Detalhe", styles["CellB"])]]
for p, tit, txt in RECS:
    rows.append([
        Table([[Paragraph(p, styles["Chip"])]], colWidths=[1.1*cm],
              style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(prio_cor[p])),
                                ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                                ("VALIGN", (0, 0), (-1, -1), "MIDDLE")])),
        Paragraph("<b>%s</b>" % esc(tit), styles["Cell"]),
        Paragraph(esc(txt), styles["Cell"]),
    ])
tr = Table(rows, colWidths=[1.4*cm, 4.4*cm, 11.2*cm], repeatRows=1)
tr.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
    ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.HexColor(C_FUNDO_HED)),
    ("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor(C_LINHA)),
    ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
]))
story.append(tr)
story.append(PageBreak())

# ---------------- ISSUES DO GITHUB
story.append(Paragraph("5. Issues para o GitHub", styles["H1"]))
story.append(Paragraph(
    "Cada bloco abaixo é o texto completo de uma issue em Markdown, pronto para copiar e colar. Achados triviais "
    "relacionados foram agrupados na mesma issue.", styles["Body"]))
story.append(Spacer(1, 0.3*cm))

def wrap(txt, width=94):
    # Quebra apenas prosa; preserva parágrafos separados por \n.
    out = []
    for par in str(txt).split("\n"):
        if not par.strip():
            out.append("")
        else:
            out.append(textwrap.fill(par, width=width, break_long_words=False,
                                     break_on_hyphens=False))
    return "\n".join(out)

def issue_md(n, iss):
    aceite = "\n".join("- [ ] %s" % c for c in iss["aceite"])
    md = (
        "--- ISSUE %d ---\n"
        "**Título:** %s\n\n"
        "**Labels:** %s\n\n"
        "## Problema\n%s\n\n"
        "## Evidência\n```\n%s\n```\n\n"
        "## Impacto\n%s\n\n"
        "## Sugestão de correção\n%s\n\n"
        "## Critérios de aceite\n%s\n"
        "--- FIM ISSUE %d ---"
    ) % (n, wrap(iss["titulo"], 80), iss["labels"], wrap(iss["problema"]), wrap(iss["evidencia"]),
         wrap(iss["impacto"]), wrap(iss["correcao"]), aceite, n)
    return md

for i, iss in enumerate(ISSUES, 1):
    bloco = [
        Paragraph("Issue %d — %s" % (i, iss["titulo"]), styles["IssueH"]),
        Preformatted(issue_md(i, iss), styles["Mono"]),
        Spacer(1, 0.35*cm),
    ]
    story.append(KeepTogether(bloco))

# ================================================================== build
doc.build(story)
print("PDF gerado em:", PDF_PATH)
