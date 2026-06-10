-- ════════════════════════════════════════════════════════════════════════════
-- SHOTOPOLY — Supabase schema
--
-- Run this whole file in the Supabase Dashboard → SQL Editor → "Run".
-- It is idempotent: safe to run on a fresh project OR on top of the existing
-- tables (it only adds what is missing).
--
-- It does three things the app cannot do by itself:
--   1. Creates/normalizes the tables.
--   2. Adds the tables to the Realtime publication  ← without this, players
--      NEVER see each other's moves. This was the multiplayer sync bug.
--   3. Creates atomic functions (RPCs) so money/turn updates can't race.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Tables ─────────────────────────────────────────────────────────────────

create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text not null,
  status     text not null default 'waiting',   -- waiting | playing | finished
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  name       text not null,
  money      bigint not null default 1500000,
  shots_owed int not null default 0,
  position   int not null default 0,
  properties jsonb not null default '[]'::jsonb,
  is_host    boolean not null default false,
  jail_turns int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.game_states (
  id                uuid primary key default gen_random_uuid(),
  room_id           uuid not null references public.rooms(id) on delete cascade,
  current_player_id uuid not null,
  turn_number       int not null default 1,
  max_turns         int not null default 60,
  dice_result       int,
  phase             text not null default 'rolling',  -- rolling | ended
  property_levels   jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

-- Columns that may be missing on projects created before this file existed
alter table public.players     add column if not exists jail_turns int not null default 0;
alter table public.players     add column if not exists created_at timestamptz not null default now();
alter table public.game_states add column if not exists max_turns int not null default 60;
alter table public.game_states add column if not exists property_levels jsonb not null default '{}'::jsonb;

create index if not exists idx_players_room on public.players(room_id);
create index if not exists idx_rooms_code   on public.rooms(code);
create index if not exists idx_gs_room      on public.game_states(room_id);

-- ── 2. Realtime ───────────────────────────────────────────────────────────────
-- postgres_changes events only fire for tables in the supabase_realtime
-- publication. This block adds them, ignoring "already added" errors.

do $$
begin
  begin
    alter publication supabase_realtime add table public.rooms;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.players;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.game_states;
  exception when duplicate_object then null;
  end;
end $$;

-- Full row data in change events (needed for filters like room_id=eq.X)
alter table public.rooms       replica identity full;
alter table public.players     replica identity full;
alter table public.game_states replica identity full;

-- ── 3. Row Level Security ─────────────────────────────────────────────────────
-- The game is anonymous (no auth), so policies are open to the anon role.
-- RLS being enabled with NO policies is the other classic cause of
-- "other players see nothing" — these policies make access explicit.

alter table public.rooms       enable row level security;
alter table public.players     enable row level security;
alter table public.game_states enable row level security;

drop policy if exists rooms_all       on public.rooms;
drop policy if exists players_all     on public.players;
drop policy if exists game_states_all on public.game_states;

create policy rooms_all       on public.rooms       for all using (true) with check (true);
create policy players_all     on public.players     for all using (true) with check (true);
create policy game_states_all on public.game_states for all using (true) with check (true);

-- ── 4. Atomic game operations (RPCs) ──────────────────────────────────────────

-- Money changes as atomic increments — no more read-modify-write races.
create or replace function public.adjust_money(p_player_id uuid, p_delta bigint)
returns void language sql as $$
  update public.players
  set money = greatest(0, money + p_delta)
  where id = p_player_id;
$$;

create or replace function public.adjust_shots(p_player_id uuid, p_delta int)
returns void language sql as $$
  update public.players
  set shots_owed = greatest(0, shots_owed + p_delta)
  where id = p_player_id;
$$;

-- Pay rent in one transaction: payer can't lose money without owner gaining it.
create or replace function public.transfer_money(p_from uuid, p_to uuid, p_amount bigint)
returns void language plpgsql as $$
begin
  update public.players set money = greatest(0, money - p_amount) where id = p_from;
  update public.players set money = money + p_amount where id = p_to;
end;
$$;

-- Advance the turn exactly once. The expected_turn guard means that if two
-- clients call this at the same time (e.g. two people hitting "skip idle
-- player"), only the first one wins — the duplicate becomes a no-op.
-- Returns the new turn_number, or -1 if the guard rejected the call.
create or replace function public.advance_turn(p_game_id uuid, p_expected_turn int)
returns int language plpgsql as $$
declare
  gs   public.game_states%rowtype;
  ids  uuid[];
  cash bigint[];
  n    int;
  ci   int;
  j    int;
begin
  select * into gs from public.game_states
  where id = p_game_id and turn_number = p_expected_turn and phase = 'rolling'
  for update;
  if not found then
    return -1;
  end if;

  select array_agg(id order by created_at), array_agg(money order by created_at)
  into ids, cash
  from public.players where room_id = gs.room_id;

  n := coalesce(array_length(ids, 1), 0);
  if n = 0 then return -1; end if;

  -- next player after the current one, skipping bankrupt players
  ci := coalesce(array_position(ids, gs.current_player_id), 1);
  j  := (ci % n) + 1;
  for k in 1..n loop
    exit when cash[j] > 0;
    j := (j % n) + 1;
  end loop;

  update public.game_states
  set current_player_id = ids[j],
      turn_number       = turn_number + 1,
      dice_result       = null,
      phase             = 'rolling'
  where id = p_game_id;

  return gs.turn_number + 1;
end;
$$;

-- End the game for everyone: flips phase + room status so every client's
-- realtime subscription shows the winner screen.
create or replace function public.end_game(p_game_id uuid)
returns void language plpgsql as $$
declare
  v_room uuid;
begin
  select room_id into v_room from public.game_states where id = p_game_id;
  update public.game_states set phase = 'ended' where id = p_game_id;
  update public.rooms set status = 'finished' where id = v_room;
end;
$$;
