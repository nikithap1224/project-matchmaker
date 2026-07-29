import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request if called from frontend
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // 1. Parse incoming request data
    const { ownerEmail, applicantName, projectTitle, pitch } = await req.json();

    // 2. Fetch Resend API key from environment variables
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable.");
    }

    // 3. Send email via Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Project Matchmaker <onboarding@resend.dev>",
        to: [ownerEmail],
        subject: `New Application for ${projectTitle}!`,
        html: `
          <h2>You received a new application!</h2>
          <p><strong>Applicant:</strong> ${applicantName}</p>
          <p><strong>Project:</strong> ${projectTitle}</p>
          <p><strong>Pitch:</strong></p>
          <blockquote>${pitch}</blockquote>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});