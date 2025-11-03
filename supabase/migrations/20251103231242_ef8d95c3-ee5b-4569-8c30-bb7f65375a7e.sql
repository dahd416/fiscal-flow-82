-- Add background customization fields to platform_settings
ALTER TABLE platform_settings 
ADD COLUMN logo_background_enabled boolean DEFAULT true,
ADD COLUMN logo_background_color text DEFAULT 'hsl(var(--primary))';