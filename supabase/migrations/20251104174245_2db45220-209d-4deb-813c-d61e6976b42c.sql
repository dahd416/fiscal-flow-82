-- Create activity logs table for audit trail
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', etc.
  table_name TEXT NOT NULL, -- Name of the table affected
  record_id UUID, -- ID of the affected record
  old_data JSONB, -- Previous state for updates/deletes
  new_data JSONB, -- New state for creates/updates
  description TEXT, -- Human-readable description
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for better query performance
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX idx_activity_logs_table_name ON public.activity_logs(table_name);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    action_type,
    table_name,
    record_id,
    old_data,
    new_data,
    description
  ) VALUES (
    p_user_id,
    p_action_type,
    p_table_name,
    p_record_id,
    p_old_data,
    p_new_data,
    p_description
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Trigger function for transactions
CREATE OR REPLACE FUNCTION public.log_transaction_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_desc TEXT;
  user_name TEXT;
BEGIN
  -- Get user name
  SELECT COALESCE(first_name || ' ' || last_name, 'Usuario') 
  INTO user_name
  FROM profiles 
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    action_desc := user_name || ' creó una transacción de ' || 
                   CASE WHEN NEW.type = 'income' THEN 'ingreso' ELSE 'egreso' END ||
                   ' por ' || NEW.amount::TEXT;
    PERFORM log_activity(
      NEW.user_id,
      'create',
      'transactions',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      action_desc
    );
  ELSIF TG_OP = 'UPDATE' THEN
    action_desc := user_name || ' actualizó una transacción';
    PERFORM log_activity(
      NEW.user_id,
      'update',
      'transactions',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      action_desc
    );
  ELSIF TG_OP = 'DELETE' THEN
    action_desc := user_name || ' eliminó una transacción de ' || 
                   CASE WHEN OLD.type = 'income' THEN 'ingreso' ELSE 'egreso' END;
    PERFORM log_activity(
      OLD.user_id,
      'delete',
      'transactions',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      action_desc
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for quotations
CREATE OR REPLACE FUNCTION public.log_quotation_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_desc TEXT;
  user_name TEXT;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, 'Usuario') 
  INTO user_name
  FROM profiles 
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    action_desc := user_name || ' creó cotización ' || NEW.quotation_number;
    PERFORM log_activity(
      NEW.user_id,
      'create',
      'quotations',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      action_desc
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      action_desc := user_name || ' cambió estado de cotización ' || NEW.quotation_number || 
                     ' de ' || OLD.status || ' a ' || NEW.status;
    ELSE
      action_desc := user_name || ' actualizó cotización ' || NEW.quotation_number;
    END IF;
    PERFORM log_activity(
      NEW.user_id,
      'update',
      'quotations',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      action_desc
    );
  ELSIF TG_OP = 'DELETE' THEN
    action_desc := user_name || ' eliminó cotización ' || OLD.quotation_number;
    PERFORM log_activity(
      OLD.user_id,
      'delete',
      'quotations',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      action_desc
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for clients
CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_desc TEXT;
  client_name TEXT;
BEGIN
  client_name := COALESCE(NEW.first_name || ' ' || COALESCE(NEW.last_name, ''), 
                          OLD.first_name || ' ' || COALESCE(OLD.last_name, ''));

  IF TG_OP = 'INSERT' THEN
    action_desc := 'Se agregó el cliente ' || client_name;
    PERFORM log_activity(
      NEW.user_id,
      'create',
      'clients',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      action_desc
    );
  ELSIF TG_OP = 'UPDATE' THEN
    action_desc := 'Se actualizó el cliente ' || client_name;
    PERFORM log_activity(
      NEW.user_id,
      'update',
      'clients',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      action_desc
    );
  ELSIF TG_OP = 'DELETE' THEN
    action_desc := 'Se eliminó el cliente ' || client_name;
    PERFORM log_activity(
      OLD.user_id,
      'delete',
      'clients',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      action_desc
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for user roles
CREATE OR REPLACE FUNCTION public.log_user_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_desc TEXT;
  target_user_name TEXT;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, 'Usuario') 
  INTO target_user_name
  FROM profiles 
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    action_desc := 'Se asignó el rol ' || NEW.role || ' a ' || target_user_name;
    PERFORM log_activity(
      auth.uid(),
      'create',
      'user_roles',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      action_desc
    );
  ELSIF TG_OP = 'DELETE' THEN
    action_desc := 'Se removió el rol ' || OLD.role || ' de ' || target_user_name;
    PERFORM log_activity(
      auth.uid(),
      'delete',
      'user_roles',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      action_desc
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for profile changes
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_desc TEXT;
  user_name TEXT;
BEGIN
  user_name := COALESCE(NEW.first_name || ' ' || NEW.last_name, 
                        OLD.first_name || ' ' || OLD.last_name, 'Usuario');

  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_suspended != NEW.is_suspended THEN
      action_desc := CASE 
        WHEN NEW.is_suspended THEN 'Usuario ' || user_name || ' fue suspendido'
        ELSE 'Usuario ' || user_name || ' fue reactivado'
      END;
    ELSIF OLD.subscription_end_date != NEW.subscription_end_date THEN
      action_desc := 'Se actualizó la suscripción de ' || user_name;
    ELSE
      action_desc := 'Se actualizó el perfil de ' || user_name;
    END IF;
    
    PERFORM log_activity(
      auth.uid(),
      'update',
      'profiles',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      action_desc
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER transaction_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION log_transaction_changes();

CREATE TRIGGER quotation_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION log_quotation_changes();

CREATE TRIGGER client_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION log_client_changes();

CREATE TRIGGER user_role_audit_trigger
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION log_user_role_changes();

CREATE TRIGGER profile_audit_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION log_profile_changes();