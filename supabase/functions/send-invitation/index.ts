import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user from JWT token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin or super_admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData) {
      throw new Error("Unauthorized: Admin access required");
    }

    const userRole = roleData.role as string;
    if (userRole !== "admin" && userRole !== "super_admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const { email }: InvitationRequest = await req.json();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Optionally: verify the email is not already registered via Auth Admin
    // Skipping explicit duplicate check here to avoid false positives when profiles don't store email.


    // Generate unique token
    const invitationToken = crypto.randomUUID();

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from("user_invitations")
      .insert({
        email,
        invited_by: user.id,
        token: invitationToken,
        status: "pending",
      })
      .select()
      .single();

    if (invitationError) {
      console.error("Error creating invitation:", invitationError);
      throw new Error("Failed to create invitation");
    }

    // Create invitation link
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const invitationLink = `${supabaseUrl.replace("supabase.co", "lovable.app")}/auth?invitation=${invitationToken}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Control Financiero <onboarding@resend.dev>",
      to: [email],
      subject: "Invitación a Control Financiero",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">¡Has sido invitado!</h1>
          <p style="color: #666; font-size: 16px;">
            Has sido invitado a unirte a Control Financiero.
          </p>
          <p style="color: #666; font-size: 16px;">
            Haz clic en el siguiente enlace para completar tu registro:
          </p>
          <a href="${invitationLink}" 
             style="display: inline-block; background-color: #4F46E5; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                    margin: 20px 0;">
            Completar Registro
          </a>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            Este enlace expirará en 7 días.
          </p>
          <p style="color: #999; font-size: 14px;">
            Si no solicitaste esta invitación, puedes ignorar este correo.
          </p>
        </div>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation: invitation
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message.includes("Unauthorized") ? 403 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
