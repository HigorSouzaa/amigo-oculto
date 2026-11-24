# Gestão de participantes e reorganização

- Admin pode alterar nome e substituir PIN por outro PIN de quatro dígitos em grupos abertos ou sorteados. O PIN atual nunca é consultado ou retornado; apenas o hash scrypt é atualizado.
- Excluir participante só é permitido com o grupo aberto. Em grupo sorteado, a API retorna `409 GROUP_DRAWN_REORGANIZE_REQUIRED` e a interface orienta a reorganização.
- `POST /api/admin/groups/:id/reorganize` requer sessão administrativa e origem permitida, só aceita grupo sorteado, remove todos os `recipientId`, marca aviso para os participantes atuais, remove `drawnAt` e reabre o mesmo grupo/link.
- Participantes anteriores continuam identificados por nome e PIN; novas pessoas podem entrar enquanto o grupo está aberto. Depois do novo sorteio, cada participante recebe exatamente uma atribuição diferente de si.
- O estado público inclui a mensagem de reorganização apenas quando existe cookie de participante válido para aquele participante; o endpoint de resultado retorna o aviso junto apenas do resultado privado próprio.
- O painel administrativo recebe IDs e nomes, nunca PINs ou hashes. Resultados anteriores não são mostrados no painel nem em respostas públicas.
- Exclusão e reorganização exigem confirmação. Não há notificação push ou envio externo: o aviso aparece quando a pessoa volta ao link/espera e junto do novo resultado.
