/**
 * Email undangan login (opsional).
 * Set RESEND_API_KEY + EMAIL_FROM di env. Tanpa itu, undangan tetap tersimpan di DB tanpa email.
 * @see https://resend.com/docs/api-reference/emails/send-email
 */
export async function sendInviteEmail(params: {
  to: string;
  invitedRole: string;
  note?: string | null;
  inviterName?: string | null;
}): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "DevOps Tracker <onboarding@resend.dev>";
  const appUrl = (process.env.NEXTAUTH_URL || process.env.AUTH_URL || "").replace(/\/$/, "");

  if (!apiKey) {
    return { ok: false, skipped: "RESEND_API_KEY tidak di-set" };
  }

  const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "";
  const subject = `Undangan akses DevOps Tracker${domain ? ` (@${domain})` : ""}`;
  const inviter = params.inviterName?.trim() || "Administrator";
  const noteBlock = params.note?.trim()
    ? `<p style="margin:16px 0 0;color:#64748b;font-size:14px">Catatan: ${escapeHtml(params.note.trim())}</p>`
    : "";

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="font-size:18px;margin:0 0 12px">Anda diundang</h1>
  <p style="margin:0;font-size:15px">${escapeHtml(inviter)} menambahkan email Anda ke daftar undangan login.</p>
  <p style="margin:12px 0 0;font-size:15px">Role yang ditetapkan: <strong>${escapeHtml(params.invitedRole)}</strong></p>
  ${noteBlock}
  ${appUrl ? `<p style="margin:24px 0 0"><a href="${escapeHtml(appUrl)}/login" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Buka portal & login</a></p>` : ""}
  <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">Pesan otomatis — jangan membalas email ini.</p>
</body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [params.to], subject, html }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) {
      return { ok: false, error: data.message || res.statusText };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return { ok: false, error: msg };
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
