-- Create calendar events table
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  event_type TEXT NOT NULL CHECK (event_type IN ('vat_payment', 'platform_payment', 'reminder', 'deadline', 'custom')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_completed BOOLEAN DEFAULT false,
  is_admin_created BOOLEAN DEFAULT false,
  reminder_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own events
CREATE POLICY "Users can view their own events"
ON public.calendar_events
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own events
CREATE POLICY "Users can create their own events"
ON public.calendar_events
FOR INSERT
WITH CHECK (auth.uid() = user_id AND NOT is_admin_created);

-- Users can update their own events (not admin-created ones)
CREATE POLICY "Users can update their own events"
ON public.calendar_events
FOR UPDATE
USING (auth.uid() = user_id AND NOT is_admin_created);

-- Users can delete their own events (not admin-created ones)
CREATE POLICY "Users can delete their own events"
ON public.calendar_events
FOR DELETE
USING (auth.uid() = user_id AND NOT is_admin_created);

-- Admins can view all events
CREATE POLICY "Admins can view all events"
ON public.calendar_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can create events for any user
CREATE POLICY "Admins can create events for any user"
ON public.calendar_events
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any event
CREATE POLICY "Admins can update any event"
ON public.calendar_events
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete any event
CREATE POLICY "Admins can delete any event"
ON public.calendar_events
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_event_date ON public.calendar_events(event_date);
CREATE INDEX idx_calendar_events_event_type ON public.calendar_events(event_type);

-- Trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();