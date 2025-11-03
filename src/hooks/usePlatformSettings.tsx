import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export function usePlatformSettings() {
  const { data: platformSettings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('*')
        .single();
      return data;
    },
  });

  // Update document title when platform settings change
  useEffect(() => {
    if (platformSettings?.platform_name) {
      document.title = platformSettings.platform_name;
    }
  }, [platformSettings?.platform_name]);

  return {
    platformSettings,
    isLoading,
  };
}
