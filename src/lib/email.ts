// Sends email through Resend's API (resend.com/docs/api-reference/emails/send-email). A plain fetch, so no SDK needed.

export type Email = {
  apiKey: string;
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments: { filename: string; content: Buffer }[];
};

/** Sends one email. Returns Resend's id for it, or throws with Resend's reason. */
export async function sendEmail(email: Email): Promise<string> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${email.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: email.from,
      to: [email.to],
      reply_to: email.replyTo,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: email.attachments.map((file) => ({ filename: file.filename, content: file.content.toString("base64") })),
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Resend refused the email (${response.status}): ${body?.message ?? "no reason given"}`);
  return body.id;
}
