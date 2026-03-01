-- Harden contacts semantics for CRM, AI read-context and document imports.
-- We introduce a structured contact role plus deterministic "primary" flags
-- for client contacts and project links.

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS contact_role TEXT,
  ADD COLUMN IF NOT EXISTS is_primary_for_client BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.contacts
SET contact_role = CASE
  WHEN title IS NULL OR btrim(title) = '' THEN NULL
  WHEN title ILIKE '%fattur%' THEN 'fatturazione'
  WHEN title ILIKE '%ammin%' OR title ILIKE '%contabil%' OR title ILIKE '%back office%' THEN 'amministrativo'
  WHEN title ILIKE '%legal%' OR title ILIKE '%avv%' OR title ILIKE '%compliance%' THEN 'legale'
  WHEN title ILIKE '%titol%' OR title ILIKE '%ceo%' OR title ILIKE '%founder%' OR title ILIKE '%dirett%' OR title ILIKE '%decision%' THEN 'decisionale'
  ELSE 'operativo'
END
WHERE contact_role IS NULL;

WITH single_contact_clients AS (
  SELECT client_id, MIN(id) AS contact_id
  FROM public.contacts
  WHERE client_id IS NOT NULL
  GROUP BY client_id
  HAVING COUNT(*) = 1
)
UPDATE public.contacts AS contacts
SET
  is_primary_for_client = TRUE,
  updated_at = NOW()
FROM single_contact_clients
WHERE contacts.id = single_contact_clients.contact_id
  AND contacts.is_primary_for_client IS DISTINCT FROM TRUE;

WITH ranked_primary_contacts AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_number
  FROM public.contacts
  WHERE client_id IS NOT NULL
    AND is_primary_for_client = TRUE
)
UPDATE public.contacts
SET
  is_primary_for_client = FALSE,
  updated_at = NOW()
WHERE id IN (
  SELECT id
  FROM ranked_primary_contacts
  WHERE row_number > 1
);

WITH ranked_primary_project_contacts AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_number
  FROM public.project_contacts
  WHERE is_primary = TRUE
)
UPDATE public.project_contacts
SET
  is_primary = FALSE,
  updated_at = NOW()
WHERE id IN (
  SELECT id
  FROM ranked_primary_project_contacts
  WHERE row_number > 1
);

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_contact_role_check;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_contact_role_check CHECK (
    contact_role IS NULL
    OR contact_role IN (
      'operativo',
      'amministrativo',
      'fatturazione',
      'decisionale',
      'legale',
      'altro'
    )
  );

CREATE OR REPLACE FUNCTION public.handle_contact_saved()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
declare contact_avatar text;
declare emails_length int8;
declare item jsonb;
begin
    new.created_at = coalesce(new.created_at, now());
    new.updated_at = now();

    if new.client_id is null then
        new.is_primary_for_client = false;
    else
        new.is_primary_for_client = coalesce(new.is_primary_for_client, false);
    end if;

    if new.is_primary_for_client = true and new.client_id is not null then
        update public.contacts
        set
            is_primary_for_client = false,
            updated_at = now()
        where client_id = new.client_id
          and id is distinct from new.id
          and is_primary_for_client = true;
    end if;

    if new.avatar is not null then
        return new;
    end if;

    select coalesce(jsonb_array_length(new.email_jsonb), 0) into emails_length;

    if emails_length = 0 then
        return new;
    end if;

    for item in select jsonb_array_elements(new.email_jsonb)
    loop
        select public.get_avatar_for_email(item->>'email') into contact_avatar;
        if contact_avatar is not null then
            exit;
        end if;
    end loop;

    if contact_avatar is null then
        return new;
    end if;

    new.avatar = concat('{"src":"', contact_avatar, '"}');
    return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_project_contact_saved()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
    new.created_at = coalesce(new.created_at, now());
    new.updated_at = now();
    new.is_primary = coalesce(new.is_primary, false);

    if new.is_primary = true then
        update public.project_contacts
        set
            is_primary = false,
            updated_at = now()
        where project_id = new.project_id
          and id is distinct from new.id
          and is_primary = true;
    end if;

    return new;
end;
$function$;

DROP TRIGGER IF EXISTS project_contact_saved ON public.project_contacts;
CREATE TRIGGER project_contact_saved
BEFORE INSERT OR UPDATE ON public.project_contacts
FOR EACH ROW EXECUTE FUNCTION public.handle_project_contact_saved();

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_primary_client_unique
  ON public.contacts (client_id)
  WHERE client_id IS NOT NULL AND is_primary_for_client = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_contacts_primary_project_unique
  ON public.project_contacts (project_id)
  WHERE is_primary = TRUE;
