import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  id: string;
  subscription_end_date: string | null;
  is_suspended: boolean;
  first_name: string | null;
  last_name: string | null;
}

interface AuthUser {
  id: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting subscription check...");

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all profiles with subscription dates (excluding admins)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, subscription_end_date, is_suspended, first_name, last_name")
      .not("subscription_end_date", "is", null);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} profiles with subscriptions`);

    // Get admin users to exclude them
    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admin roles:", adminError);
      throw adminError;
    }

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

    // Get all user emails
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    const userEmailMap = new Map(users.map((u) => [u.id, u.email || '']));

    for (const profile of profiles as Profile[]) {
      // Skip admins
      if (adminUserIds.has(profile.id)) {
        console.log(`Skipping admin user ${profile.id}`);
        continue;
      }

      if (!profile.subscription_end_date) continue;

      const endDate = new Date(profile.subscription_end_date);
      endDate.setHours(0, 0, 0, 0);
      
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      console.log(`User ${profile.id}: ${diffDays} days until expiration`);

      const userEmail = userEmailMap.get(profile.id);
      const userName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Usuario";

      // 3 days before expiration - send notification
      if (diffDays === 3) {
        await supabase.from("notifications").insert({
          user_id: profile.id,
          title: "Suscripción por vencer",
          message: "Tu suscripción vence en 3 días. Por favor, renueva tu plan para continuar usando la plataforma.",
          type: "warning",
        });
        console.log(`Sent 3-day warning notification to ${profile.id}`);
      }

      // Day of expiration - send email
      if (diffDays === 0) {
        await supabase.from("notifications").insert({
          user_id: profile.id,
          title: "Suscripción vencida",
          message: "Tu suscripción ha vencido hoy. Por favor, renueva tu plan para evitar la suspensión de tu cuenta.",
          type: "error",
        });

        if (userEmail) {
          try {
            await resend.emails.send({
              from: "Control Financiero <onboarding@resend.dev>",
              to: [userEmail],
              subject: "Tu suscripción ha vencido",
              html: `
                <h1>Hola ${userName},</h1>
                <p>Tu suscripción a Control Financiero ha vencido hoy.</p>
                <p>Para continuar usando la plataforma sin interrupciones, por favor renueva tu suscripción lo antes posible.</p>
                <p>Si no renuevas en los próximos 5 días, tu cuenta será suspendida automáticamente.</p>
                <p>Saludos,<br>El equipo de Control Financiero</p>
              `,
            });
            console.log(`Sent expiration email to ${userEmail}`);
          } catch (emailError) {
            console.error(`Error sending email to ${userEmail}:`, emailError);
          }
        }
      }

      // 5 days after expiration - suspend account
      if (diffDays === -5 && !profile.is_suspended) {
        await supabase
          .from("profiles")
          .update({ is_suspended: true })
          .eq("id", profile.id);

        await supabase.from("notifications").insert({
          user_id: profile.id,
          title: "Cuenta suspendida",
          message: "Tu cuenta ha sido suspendida por falta de pago. Contacta al administrador para reactivarla.",
          type: "error",
        });

        console.log(`Suspended account ${profile.id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Subscription check completed",
        checked: profiles?.length || 0 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-subscriptions function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
