-- Crear función para generar evento de fecha de corte automáticamente
CREATE OR REPLACE FUNCTION create_payment_deadline_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si el usuario tiene fecha de suscripción, crear evento de recordatorio
  IF NEW.subscription_end_date IS NOT NULL THEN
    -- Eliminar eventos anteriores de pago de plataforma para este usuario
    DELETE FROM calendar_events 
    WHERE user_id = NEW.id 
    AND event_type = 'platform_payment'
    AND is_admin_created = true;
    
    -- Crear nuevo evento de fecha de corte
    INSERT INTO calendar_events (
      user_id,
      created_by,
      title,
      description,
      event_date,
      event_type,
      priority,
      is_admin_created,
      reminder_days
    ) VALUES (
      NEW.id,
      NEW.id,
      'Fecha de Corte - Pago de Plataforma',
      'Renovación de suscripción. Asegúrate de realizar el pago antes de esta fecha.',
      NEW.subscription_end_date,
      'platform_payment',
      'urgent',
      true,
      3
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para actualizar eventos cuando cambie la fecha de suscripción
DROP TRIGGER IF EXISTS update_payment_deadline_event ON public.profiles;
CREATE TRIGGER update_payment_deadline_event
  AFTER INSERT OR UPDATE OF subscription_end_date ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_payment_deadline_event();

-- Generar eventos para todos los usuarios existentes con fecha de suscripción
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id, subscription_end_date 
    FROM profiles 
    WHERE subscription_end_date IS NOT NULL
  LOOP
    -- Eliminar eventos anteriores
    DELETE FROM calendar_events 
    WHERE user_id = profile_record.id 
    AND event_type = 'platform_payment'
    AND is_admin_created = true;
    
    -- Crear evento de fecha de corte
    INSERT INTO calendar_events (
      user_id,
      created_by,
      title,
      description,
      event_date,
      event_type,
      priority,
      is_admin_created,
      reminder_days
    ) VALUES (
      profile_record.id,
      profile_record.id,
      'Fecha de Corte - Pago de Plataforma',
      'Renovación de suscripción. Asegúrate de realizar el pago antes de esta fecha.',
      profile_record.subscription_end_date,
      'platform_payment',
      'urgent',
      true,
      3
    );
  END LOOP;
END $$;