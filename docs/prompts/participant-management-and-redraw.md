# Prompt de implementação — gestão de participantes e novo sorteio

## Objetivo
Adicionar ao sistema de amigo oculto ferramentas administrativas para corrigir dados de participantes, remover participantes de grupos ainda abertos e reorganizar um sorteio concluído para aceitar mudanças e sortear novamente.

## Contexto
O projeto usa Next.js App Router, React, MongoDB Atlas e armazenamento local para desenvolvimento. A sessão administrativa é protegida por cookie HTTP-only. Cada participante tem ID estável, nome, `nameKey` e PIN guardado como hash; o resultado aponta para `recipientId`. Atualmente grupos têm estado `open` ou `drawn`, e o sorteio concluído impede novas entradas.

## Papel e coordenação
Atue como coordenador full-stack usando `dev-master`, `dev-front-master`, `dev-back-master` e `prompt-engineer`. Inspecione as instruções locais e preserve a arquitetura. Defina contratos de API, estados e erros antes de implementar frontend e backend.

## Tarefas
1. No painel administrativo de cada grupo, permita editar o nome de um participante e redefinir o PIN para um novo PIN numérico de quatro dígitos. Nunca mostre nem retorne o PIN atual; valide e armazene somente seu hash. Preserve o ID do participante para não alterar relações de sorteio.
2. Permita excluir um participante enquanto o grupo está aberto. Se o grupo estiver sorteado, bloqueie a remoção e explique que o organizador deve reorganizar o sorteio primeiro. O usuário confirmou essa regra: após o sorteio, o admin reorganiza e só então exclui a pessoa.
3. Para grupos sorteados, adicione ação **Reorganizar sorteio** com confirmação explícita. Ao confirmar, reabra inscrições, apague todas as atribuições existentes e invalide os resultados anteriores. O organizador pode compartilhar novamente o mesmo link; participantes existentes continuam reconhecidos por nome e novo PIN, e novos participantes podem entrar.
4. Permita realizar novo sorteio apenas quando o grupo reaberto tiver pelo menos duas pessoas. Gere uma atribuição completa sem autoatribuições.
5. Informe claramente aos participantes que o grupo foi alterado e que haverá um novo sorteio. Mostre o aviso enquanto o grupo está reaberto e também junto do resultado após o próximo sorteio para participantes que estavam no sorteio anterior. Não exiba pares anteriores em mensagens, API pública ou painel.
6. Mantenha cartões de grupos múltiplos existentes e integre as ações no cartão apropriado, com responsividade e acessibilidade.

## Contratos sugeridos
- `PATCH /api/admin/groups/:groupId/participants/:participantId` com `{ name?: string, pin?: string }`; validar nome, PIN, nome duplicado e grupo/participante existentes. Resposta retorna apenas `{ participant: { id, name } }`.
- `DELETE /api/admin/groups/:groupId/participants/:participantId`; disponível apenas em grupo aberto.
- `POST /api/admin/groups/:groupId/reorganize`; disponível somente em grupo sorteado, limpa `recipientId`, reabre grupo e marca aviso de reorganização para participantes existentes.
- Expandir `POST /api/admin/groups/:groupId/draw` para novo sorteio após reorganização, com concorrência protegida por estado/versão.
- `POST /api/groups/:token/result` retorna exclusivamente o resultado do participante autenticado e um indicador/mensagem de reorganização apropriado ao participante. Mantenha o aviso sem revelar resultados antigos.
- Erros esperados: `401 UNAUTHORIZED`, `403 ORIGIN_FORBIDDEN`, `404 GROUP_NOT_FOUND`, `404 PARTICIPANT_NOT_FOUND`, `400 INVALID_INPUT`, `409 DUPLICATE_NAME`, `409 GROUP_DRAWN_REORGANIZE_REQUIRED`, `409 GROUP_NOT_DRAWN`, `409 NOT_ENOUGH_PARTICIPANTS`, `409 GROUP_CHANGED`, `429 RATE_LIMITED`.

## Restrições
- Validar tudo no servidor; verificar sessão administrativa e origem nos endpoints mutáveis.
- Limitar tentativas de redefinição/autenticação conforme mecanismos existentes.
- Não armazenar PIN em texto puro, não registrar PINs e não retornar hashes.
- Reorganização deve invalidar todas as atribuições antigas de modo atômico ou com controle otimista de versão.
- Remoção e reorganização exigem confirmação na interface; avisar o impacto antes da confirmação.
- Não publicar em produção sem autorização específica. Segredos permanecem fora do repositório.

## Critérios de aceite
- Admin corrige nome/PIN e participante autentica com os novos dados; o PIN antigo deixa de funcionar.
- Admin consegue excluir participante de grupo aberto; exclusão de grupo sorteado é bloqueada até reorganização.
- Reorganizar limpa resultados anteriores, permite nova entrada pelo mesmo link e marca grupo como aberto.
- Após novo sorteio, cada participante ativo recebe exatamente um destinatário diferente de si.
- Participantes afetados veem aviso de que o sorteio foi reorganizado; nenhum resultado anterior é exposto.
- Os novos fluxos funcionam em desktop e celular, com estados de carregamento, sucesso, erro e confirmação.
- Typecheck, lint, build e verificações de contrato/regressão passam.

## Decisões confirmadas
- Remoção após sorteio exige primeiro **Reorganizar sorteio**; excluir alguém nunca deve invalidar pares silenciosamente.
- Corrigir nome ou redefinir PIN pode ser feito em grupo sorteado sem alterar os pares.

## Entrega
Resuma mudanças, contratos, arquivos principais, verificações realizadas e pendências. Não exponha raciocínio interno; reporte apenas decisões e evidências.
