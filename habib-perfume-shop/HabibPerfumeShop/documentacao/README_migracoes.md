# Migrações / Atualizações de Esquema

## Adicionar coluna senha em funcionario
Se o banco já existia antes da alteração:
```sql
ALTER TABLE funcionario ADD COLUMN IF NOT EXISTS senha VARCHAR(255);
UPDATE funcionario SET senha = 'alterar123' WHERE senha IS NULL;
```
Depois atualize manualmente cada senha conforme necessário:
```sql
UPDATE funcionario SET senha='gerente123' WHERE cpf='99911111111';
```

## Novo fluxo de login (atualizado com email para funcionário)
- Universal: POST /login/universal { email, senha }
- (Legados ainda disponíveis) Cliente: POST /login/cliente { email, senha }
- (Legados ainda disponíveis) Funcionário: POST /login/funcionario { email OU cpf, senha }
- Cadastro cliente: POST /login/cadastrarCliente { cpf, nome, email, senha }
- Status sessão: GET /login/status
- Logout: POST /login/logout

Respostas padronizadas:
```json
{ "status":"ok", "usuario": { "tipo":"cliente|funcionario", "cpf":"...", "nome":"...", "email":"...", "cargo":"...", "gerente":true|false } }
```
Erro:
```json
{ "status":"erro", "mensagem":"Texto do erro" }
```

## Hashing de Senhas (Atualização de Segurança)
Agora as senhas novas são armazenadas usando bcrypt (salt com custo 10). O código reconhece senhas antigas em texto puro (fallback) até que a migração seja executada.

### Script de Migração
Execute uma vez para converter senhas em texto puro para hash:
```
node backend/scripts/migrar_hash_senhas.js
```
O script:
- Percorre `cliente` e `funcionario`.
- Ignora senhas já iniciadas com `$2` (já migradas).
- Substitui as demais por hash bcrypt.

### Novos Endpoints Relacionados
- Alterar senha autenticado: `POST /login/alterarSenha { senhaAtual, novaSenha }`
	- Requer cookie de sessão.
	- Valida senha atual comparando hash (ou texto puro legado) e sobrescreve com novo hash.

### Boas Práticas Futuras
- Remover endpoints legados `/login/verificarEmail` e `/login/verificarSenha` quando não mais necessários.
- Forçar complexidade mínima de senha (atualmente apenas tamanho >= 4).
- Adicionar limite de tentativas / lockout.

## Observações
- Campo `gerente` é derivado se `cargo ILIKE '%gerente%'`.
- Para adicionar email em um banco existente use: `migracao_add_email_funcionario.sql`.
- Cookies agora incluem email em ambos os tipos de usuário.
- Senhas novas sempre são hash; antigas são migradas via script.
