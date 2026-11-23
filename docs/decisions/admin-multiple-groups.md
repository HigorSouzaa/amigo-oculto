# Admin: múltiplos grupos e exclusão

- O painel lista todos os grupos do organizador em ordem de criação mais recente e mantém cada grupo em um cartão independente.
- O estado do sorteio aparece como selo compacto no canto superior do cartão.
- O link de participação permanece copiável tanto antes quanto depois do sorteio.
- `DELETE /api/admin/groups/:id` requer sessão administrativa e origem permitida; responde `{ ok: true }`, `401 UNAUTHORIZED`, `403 ORIGIN_FORBIDDEN` ou `404 GROUP_NOT_FOUND`.
- A exclusão remove definitivamente o grupo e participantes; a interface sempre pede confirmação e informa que os links param de funcionar.
- Após exclusão, o painel recarrega e mostra os demais cartões; quando vazio, oferece criar novo grupo.
