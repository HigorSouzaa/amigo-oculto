# Amigo Oculto

Aplicação de amigo secreto em Next.js, com rotas de servidor e MongoDB Atlas. O painel do organizador e as telas dos participantes compartilham o contrato descrito abaixo e a mesma identidade visual responsiva.

## Executar localmente

1. Instale Node.js 20.9+.
2. Rode `npm install`, copie `.env.example` para `.env.local` e gere `SESSION_SECRET` com `openssl rand -base64 48` ou equivalente.
3. Rode `npm run dev` e abra `http://localhost:3000`. O script usa um arquivo `.local-data/groups.json` e cria dados locais de teste.

O primeiro `npm install` pode parecer parado enquanto baixa Next.js/SWC; nesta máquina o pacote do Next levou cerca de 69 segundos e algumas respostas de metadados do registry levaram até 58 segundos. O projeto usa `.npmrc` com `prefer-offline` para aproveitar o cache em execuções seguintes.

**Acesso administrativo de demonstração (somente local):** usuário `admin`, senha `AmigoOculto2026!`. Não habilite `STORAGE_DRIVER=local` em produção e troque o segredo antes de usar um deploy. O arquivo JSON local não é banco de produção, não tem transações entre processos e deve conter apenas dados descartáveis de teste.

Para usar Atlas localmente, remova `STORAGE_DRIVER=local`, preencha `MONGODB_URI`/`MONGODB_DB`, e configure `ADMIN_USERNAME` com `ADMIN_PASSWORD_HASH`. Gere esse hash com `npm run hash-password -- "uma-senha-longa-e-unica"`.

O admin é provisionado por ambiente; não existe cadastro público de administradores. O modo local de demonstração fornece credenciais fixas apenas fora da produção. O primeiro acesso é `/admin/login`.

## Contrato e estados

- Grupo: `open` (recebendo participantes, aguardando sorteio) → `drawn` (sorteio definitivo, participantes congelados). Não há transição de volta.
- Participante: registro por nome e hash scrypt de PIN; após autenticação, `participant_session` assinado e HTTP-only permite consultar apenas o próprio resultado. A sessão dura 30 minutos.
- Nomes únicos por grupo, comparados após normalização Unicode e sem distinção de maiúsculas/minúsculas. Nome repetido: `409 DUPLICATE_NAME`. PIN: exatamente quatro dígitos; PIN inválido: `400 INVALID_INPUT`. Participante inexistente, PIN incorreto e grupo inexistente sempre respondem `401 INVALID_CREDENTIALS` para reduzir enumeração.
- Grupos com menos de 2 participantes não podem sortear (`409 NOT_ENOUGH_PARTICIPANTS`). Grupo sorteado não aceita entradas nem novo sorteio (`409 GROUP_CLOSED` / `409 ALREADY_DRAWN`). Sorteio usa permutação cíclica aleatória criptográfica: cada participante aparece exatamente uma vez, sem autoatribuição.
- Os pares ficam no banco e só a rota autenticada de resultado consulta o destinatário individual. A API do painel seleciona explicitamente nomes e estados, nunca os pares. Nenhum PIN, senha ou token é gravado em logs.

### Rotas

| Método e rota | Autenticação | Entrada | Resposta/erros principais |
| --- | --- | --- | --- |
| `POST /api/admin/login` | nenhuma | `{ username, password }` | `{ ok: true }`; `401 INVALID_CREDENTIALS`, `429 RATE_LIMITED` |
| `POST /api/admin/logout` | admin | — | `{ ok: true }` |
| `GET /api/admin/groups` | admin | — | `{ groups: [{id,name,status,participantCount,createdAt}] }` |
| `POST /api/admin/groups` | admin | `{ name }` | `201 { group: {id,name,token,status,joinUrl,...} }` |
| `GET /api/admin/groups/:id` | admin | — | `{ group: {id,name,status,participants:[{name,joinedAt}],joinUrl} }` |
| `POST /api/admin/groups/:id/draw` | admin | — | `{ ok: true }`; sem expor atribuições |
| `GET /api/groups/:token` | pública | — | `{ group: {name,status} }`; `404 GROUP_UNAVAILABLE` |
| `POST /api/groups/:token/join` | pública | `{ name, pin }` | cookie privado + `{ status }`; `409 DUPLICATE_NAME`, `409 GROUP_CLOSED` |
| `POST /api/groups/:token/result` | sessão participante | — | `{ result: {participantName,recipientName} }`; `409 DRAW_PENDING` |

Erros seguem `{ error: { code, message } }`. Cookies assinados `HttpOnly`, `SameSite=Lax`, `Secure` em produção e `Path=/`; mutações validam `Origin` contra `APP_URL`. Limite em memória: até 8 tentativas de login/entrada/consulta por IP e janela de 15 minutos por instância. Para deployment com múltiplas instâncias, migrar o limitador para armazenamento compartilhado antes de expor tráfego relevante. O painel exibe o grupo mais recente; ele ainda não oferece seletor para grupos anteriores.

## Publicação na Vercel

Importe o repositório, defina as variáveis de `.env.example` nas configurações do projeto Vercel, troque `APP_URL` pelo domínio HTTPS e configure a allowlist de IP/network access do Atlas. Faça primeiro um deploy de preview e verifique os fluxos com dados de teste. Este projeto não foi publicado; a conta Vercel/Atlas e suas credenciais são do proprietário.

## Privacidade

PINs são armazenados com scrypt e salt; senha administrativa permanece em variável de ambiente e é comparada por derivação scrypt. Segredos ficam em variáveis de ambiente e `.env*` é ignorado pelo Git. Cookies de participante e admin são separados. O limitador atual em memória não compartilha contagem entre instâncias/serverless; use KV compartilhado para proteção forte em produção. Um admin com acesso ao banco pode ver documentos; limite esse acesso e habilite auditoria no Atlas.
