-- Enforce marketing opt-outs for admin notifications at the database layer.
-- Promotional and offer notifications are skipped when the recipient has opted out.

CREATE OR REPLACE FUNCTION public.enforce_marketing_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  profile_prefs jsonb;
  email_offers boolean := true;
  push_offers boolean := true;
  marketing_pref text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.type IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.type NOT IN ('promotional', 'offer') THEN
    RETURN NEW;
  END IF;

  SELECT up.notification_preferences
    INTO profile_prefs
  FROM public.user_profiles up
  WHERE up.id = NEW.user_id
  LIMIT 1;

  profile_prefs := COALESCE(profile_prefs, '{}'::jsonb);
  marketing_pref := profile_prefs->>'marketingNotificationPreference';

  IF profile_prefs->>'emailOffers' IN ('true', 'false') THEN
    email_offers := (profile_prefs->>'emailOffers')::boolean;
  END IF;

  IF profile_prefs->>'pushOffers' IN ('true', 'false') THEN
    push_offers := (profile_prefs->>'pushOffers')::boolean;
  END IF;

  IF NEW.type = 'promotional' AND marketing_pref = 'skip' THEN
    RETURN NULL;
  END IF;

  IF NEW.type = 'offer' AND NOT (email_offers OR push_offers) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_marketing_notification_preferences ON public.notifications;
CREATE TRIGGER trg_enforce_marketing_notification_preferences
BEFORE INSERT ON public.notifications
FOR EACH ROW
WHEN (NEW.type IN ('promotional', 'offer'))
EXECUTE FUNCTION public.enforce_marketing_notification_preferences();
