

# Auditoria de Segurança — Sistema de Concurso Cosplay

Análise feita assumindo risco real de produção. URL pública: `https://sistema.alucardanimes.com.br/`. Backend totalmente exposto pelo cliente com `anon key`.

---

## Veredito imediato

**O backend está completamente aberto.** Qualquer pessoa, sem login, com a `anon key` (que está embutida no JS público), pode:

- Ler todos os participantes e notas.
- **Inserir, alterar e apagar** qualquer participante.
- **Inserir, alterar e apagar** qualquer nota de qualquer jurado.
- Apagar **todos** os dados em uma única requisição.

A página de login e o `ProtectedRoute` são apenas teatro de UI — a proteção real (RLS) não existe nas tabelas de negócio. A rota `/avaliacao` (jurados) está totalmente pública.

---

## Achados

### 🔴 CRÍTICO 1 — `inscritos`: INSERT/UPDATE/DELETE público

- **Local:** policies `Permitir inserção/atualização/exclusão pública de inscritos` na tabela `public.inscritos`.
- **Impacto:** apagamento total da base, injeção de inscritos falsos, alteração de categoria/cosplay de qualquer participante. O componente `ParticipantesTable` já expõe `DELETE FROM inscritos` em massa via `anon`.
- **Exploração:** com a `anon key` pública, basta `supabase.from('inscritos').delete().neq('id','00...')` de qualquer aba do navegador.
- **Correção:** restringir mutações ao role `admin` via `has_role(auth.uid(),'admin')`.

### 🔴 CRÍTICO 2 — `notas`: INSERT/UPDATE/DELETE público (fraude de concurso)

- **Local:** policies `Permitir ... pública de notas` em `public.notas`.
- **Impacto:** qualquer visitante pode dar 10 ao próprio cosplay, zerar concorrentes, apagar todas as notas. Resultado do concurso é manipulável por qualquer um. Em `/avaliacao` o `setNota` é chamado direto pelo cliente sem qualquer autenticação.
- **Correção:** mutações apenas para usuários autenticados com role `admin` ou `juror` (criar nova role). SELECT pode permanecer público (placar exibido na home).

### 🔴 CRÍTICO 3 — Rota `/avaliacao` sem autenticação

- **Local:** `src/App.tsx` — `<Route path="/avaliacao" element={<Avaliacao/>} />` sem `ProtectedRoute`.
- **Impacto:** qualquer pessoa acessa a tela de jurados e digita notas. Combinado com #2, isso é passe livre para fraude.
- **Correção:** envolver em `<ProtectedRoute>` exigindo role `juror` ou `admin`. Mesmo cobertura para `/apresentacao` e `/ranking` se forem internos (confirmar com o usuário; provavelmente ranking é público).

### 🟠 ALTO 4 — Auto-cadastro de admin é trivial

- **Local:** `Login.tsx` aba "Cadastrar" + ausência de gating no signup. Como qualquer email pode se cadastrar e a tela `/admin` exige só role `admin`, o vetor é: cadastrar conta → admin manual concede role. Mas hoje **não existe** um admin inicial e não há fluxo restrito. Pior: como `inscritos`/`notas` estão abertos, nem precisa virar admin.
- **Impacto:** ausência de bootstrap controlado de roles. Sem proteção, o primeiro a se cadastrar e conseguir um INSERT em `user_roles` (não tem policy de INSERT pública, ok) ainda fica preso, mas a aba pública de signup é desnecessária e amplia superfície.
- **Correção:** remover aba "Cadastrar" do `/login` (admin é criado por seed/migration). Documentar processo de seed do primeiro admin via SQL.

### 🟠 ALTO 5 — Leaked Password Protection desabilitado

- **Local:** Auth settings.
- **Impacto:** admins podem usar senhas vazadas conhecidas.
- **Correção:** ativar HIBP no Auth.

### 🟡 MÉDIO 6 — `profiles` SELECT exposto a qualquer autenticado

- **Local:** policy `Users can view all profiles`.
- **Impacto:** qualquer usuário logado lista todos os `display_name` e `id` (uuid). Vazamento menor, mas é cross-user desnecessário.
- **Correção:** restringir SELECT a `auth.uid() = id OR has_role(auth.uid(),'admin')`.

### 🟡 MÉDIO 7 — `id` da tabela `notas` sem default e sem FK

- **Local:** schema `notas`. Coluna `id uuid` é PK lógica mas sem `REFERENCES inscritos(id) ON DELETE CASCADE`. Hoje notas órfãs ficam para trás se um inscrito for apagado por fora.
- **Impacto:** integridade. Não é vazamento, mas favorece estado inconsistente que pode ser explorado para confundir auditoria.
- **Correção:** adicionar FK com `ON DELETE CASCADE`.

### 🟡 MÉDIO 8 — Sem rate limiting / sem validação server-side de range das notas

- **Local:** `useCosplayData.setNota` envia o que `clampNota` produzir, mas o cliente é confiável zero.
- **Impacto:** com #2 corrigido (mutação só por jurado autenticado), ainda assim um jurado malicioso pode mandar `999`. Hoje o `clamp` é só client-side.
- **Correção:** trigger BEFORE INSERT/UPDATE em `notas` que valida `0 <= valor <= 10` e arredonda para 2 casas.

### 🟢 BAIXO 9 — `anon key` no bundle

- Esperado e seguro **se** RLS estiver correto. Hoje é um amplificador dos críticos acima. Sem ação direta após corrigir RLS.

---

## Plano de correção (a ser aplicado em modo default após aprovação)

### A. Migration SQL — endurecer RLS

```sql
-- 1. Nova role para jurados
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'juror';

-- 2. inscritos: somente admin pode mutar
DROP POLICY "Permitir inserção pública de inscritos"   ON public.inscritos;
DROP POLICY "Permitir atualização pública de inscritos" ON public.inscritos;
DROP POLICY "Permitir exclusão pública de inscritos"   ON public.inscritos;

CREATE POLICY "Admins inserem inscritos" ON public.inscritos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins atualizam inscritos" ON public.inscritos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins deletam inscritos" ON public.inscritos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
-- SELECT público mantido (placar na home).

-- 3. notas: jurados/admin mutam, leitura pública
DROP POLICY "Permitir inserção pública de notas"   ON public.notas;
DROP POLICY "Permitir atualização pública de notas" ON public.notas;
DROP POLICY "Permitir exclusão pública de notas"   ON public.notas;

CREATE POLICY "Jurados inserem notas" ON public.notas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'juror') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Jurados atualizam notas" ON public.notas
  FOR UPDATE TO authenticated
  USING  (public.has_role(auth.uid(),'juror') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'juror') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins deletam notas" ON public.notas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 4. Integridade + validação de notas
ALTER TABLE public.notas
  ADD CONSTRAINT notas_id_fk FOREIGN KEY (id) REFERENCES public.inscritos(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.validate_nota()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.jurado_1 IS NOT NULL AND (NEW.jurado_1 < 0 OR NEW.jurado_1 > 10) THEN
    RAISE EXCEPTION 'jurado_1 fora do range 0-10';
  END IF;
  IF NEW.jurado_2 IS NOT NULL AND (NEW.jurado_2 < 0 OR NEW.jurado_2 > 10) THEN
    RAISE EXCEPTION 'jurado_2 fora do range 0-10';
  END IF;
  IF NEW.jurado_3 IS NOT NULL AND (NEW.jurado_3 < 0 OR NEW.jurado_3 > 10) THEN
    RAISE EXCEPTION 'jurado_3 fora do range 0-10';
  END IF;
  NEW.jurado_1 := round(NEW.jurado_1, 2);
  NEW.jurado_2 := round(NEW.jurado_2, 2);
  NEW.jurado_3 := round(NEW.jurado_3, 2);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_nota BEFORE INSERT OR UPDATE ON public.notas
  FOR EACH ROW EXECUTE FUNCTION public.validate_nota();

-- 5. profiles: só dono ou admin
DROP POLICY "Users can view all profiles" ON public.profiles;
CREATE POLICY "Owner ou admin lê profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
```

### B. Frontend

- `src/App.tsx`: envolver `/avaliacao` em `<ProtectedRoute>` aceitando `juror` ou `admin`. Manter `/ranking`, `/apresentacao`, `/` públicos (confirmar com o usuário).
- `src/components/ProtectedRoute.tsx`: aceitar prop `requireRole?: 'admin'|'juror'` e checar via `has_role`.
- `src/hooks/useAuth.ts`: expor `isJuror` além de `isAdmin`.
- `src/pages/Login.tsx`: remover aba "Cadastrar" (signup público desnecessário). Login apenas.
- `src/components/cosplay/Header.tsx`: esconder atalho "Jurados" e "Inscrições" para quem não tem role; esconder "Admin" para quem não é admin.
- `src/components/cosplay/Inscricoes.tsx`: este componente faz `addInscrito/deleteInscrito` direto. Após RLS, só admin consegue. Esconder/bloquear UI quando `!isAdmin`.

### C. Auth settings

- Ativar **Leaked Password Protection (HIBP)**.
- Manter "Confirm email" ligado.

### D. Bootstrap do primeiro admin

Como signup será removido, gerar o primeiro admin via SQL após o usuário criar a conta:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<uuid-do-usuario>', 'admin');
```

Documentar no chat para o usuário rodar uma vez. Concessão de role `juror` para os 3 jurados acontece por admin via UI (a ser criada como item de roadmap, fora deste plano).

---

## Como testar (após patch)

1. Anônimo (logout): tentar `supabase.from('inscritos').delete().neq('id','00...')` no console → deve falhar com policy violation.
2. Anônimo: tentar `supabase.from('notas').upsert({id:'<uuid>',jurado_1:10})` → deve falhar.
3. Anônimo: navegar para `/avaliacao` → redirect para `/login`.
4. Anônimo: navegar para `/` → continua vendo placar (SELECT público).
5. Admin logado: CRUD de inscritos funciona; nota com valor `99` é rejeitada pelo trigger.
6. Jurado logado (não-admin): consegue dar nota, **não** consegue apagar inscrito.
7. Apagar inscrito → notas associadas somem (CASCADE).

---

## Bloqueadores de produção

**Não publique antes de:**
- Aplicar a migration A (RLS).
- Proteger `/avaliacao` (B).
- Remover signup público (B).
- Ativar HIBP (C).
- Criar primeiro admin via SQL (D).

## O que ainda pode vazar mesmo após o patch
- Lista pública de participantes e notas continua legível por qualquer um (decisão de produto — placar precisa ser público). Se houver dado pessoal em `nome`, considerar exibir só primeiro nome.
- Não há rate limit em login do Supabase Auth gratuito além do default; brute-force lento ainda é teoricamente possível.

## O que continua fora deste plano
- UI de gestão de roles (conceder `juror` a usuários) — sugiro como próximo passo.
- Logs de auditoria de quem alterou cada nota (recomendado para concurso).

