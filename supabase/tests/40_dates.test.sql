-- =============================================================================
-- Test 40 — « Aujourd'hui » est la date de Porto-Novo
-- =============================================================================
-- Côté SQL, « aujourd'hui » = (now() at time zone 'Africa/Porto-Novo')::date,
-- via la fonction aujourdhui(), jamais current_date (qui dépend du fuseau de la
-- session : UTC sur Supabase). Pour que le test prouve quelque chose à toute
-- heure, la session est placée dans un fuseau où current_date diffère À CET
-- INSTANT de la date de Porto-Novo (UTC+14 l'après-midi à Porto-Novo, UTC−11 le
-- matin) ; on vérifie alors que la visibilité des emplacements publicitaires
-- suit la date de Porto-Novo et non current_date.
-- Données fictives, préfixe [TEST], annulées à la fin (rollback).
-- =============================================================================
begin;

do $$
declare
  v_heure_pn int := extract(hour from (now() at time zone 'Africa/Porto-Novo'))::int;
  v_fuseau text;
begin
  perform test_verifier(current_setting('TimeZone') = 'UTC',
    'la base de test tourne en UTC, comme Supabase');

  -- Porto-Novo : UTC+1 toute l'année (pas d'heure d'été). Calcul indépendant.
  perform test_verifier(aujourdhui() = ((now() at time zone 'UTC') + interval '1 hour')::date,
    format('aujourdhui() = date UTC+1 de Porto-Novo (%s)', aujourdhui()));

  v_fuseau := case when v_heure_pn >= 12 then 'Pacific/Kiritimati' else 'Pacific/Pago_Pago' end;
  perform set_config('timezone', v_fuseau, true);
  perform test_verifier(current_date <> aujourdhui(),
    format('préalable : en %s, current_date (%s) diffère de la date de Porto-Novo (%s)',
           v_fuseau, current_date, aujourdhui()));
  perform test_verifier(aujourdhui() = ((now() at time zone 'UTC') + interval '1 hour')::date,
    'aujourdhui() ne dépend pas du fuseau de la session');

  insert into public.emplacements_pub (type, titre, annonceur, date_debut, date_fin, actif) values
    ('banniere_accueil', '[TEST] Emplacement du jour à Porto-Novo', '[TEST] Annonceur', aujourdhui(), aujourdhui(), true),
    ('banniere_accueil', '[TEST] Emplacement du jour dans le fuseau de session', '[TEST] Annonceur', current_date, current_date, true);

  perform test_anonyme();
  perform test_verifier(
    exists (select 1 from public.emplacements_pub where titre = '[TEST] Emplacement du jour à Porto-Novo'),
    'anonyme : un emplacement dont la période est le jour de Porto-Novo est visible');
  perform test_verifier(
    not exists (select 1 from public.emplacements_pub where titre = '[TEST] Emplacement du jour dans le fuseau de session'),
    'anonyme : un emplacement dont la période est current_date (autre fuseau) est invisible');
  perform test_deconnecter();

  perform set_config('timezone', 'UTC', true);
end
$$;

rollback;
