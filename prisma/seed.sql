-- Inserir Vendedor de Teste
INSERT INTO "Vendedor" (id, nome, email, telefone, comissao, regiao, "criadoEm", "updatedAt")
VALUES (1, 'Vendedor Teste', 'vendedor@newflexo.com.br', '(11) 99999-9999', 5.0, 'São Paulo', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Inserir Usuário Admin
INSERT INTO "User" (id, nome, email, senha, role, ativo, "criadoEm", "updatedAt")
VALUES (1, 'Administrador', 'admin@newflexo.com.br', 'admin', 'admin', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Inserir Usuário Vendedor vinculado
INSERT INTO "User" (id, nome, email, senha, role, ativo, "vendedorId", "criadoEm", "updatedAt")
VALUES (2, 'Vendedor Teste', 'vendedor@newflexo.com.br', '123', 'vendedor', true, 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Inserir Status Iniciais
INSERT INTO "Status" (id, nome, ordem, modulo, cor, ativo, "criadoEm", "updatedAt")
VALUES 
(1, 'Pendente', 1, 'orcamento', '#facc15', true, NOW(), NOW()),
(2, 'Aprovado', 2, 'orcamento', '#22c55e', true, NOW(), NOW()),
(3, 'Em Produção', 1, 'pedido', '#3b82f6', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Inserir Configuração de IA
INSERT INTO "AIConfig" (id, provider, "updatedAt")
VALUES (1, 'gemini-flash', NOW())
ON CONFLICT (id) DO NOTHING;
