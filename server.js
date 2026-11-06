const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as local health checks.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
  }),
);

app.use(express.json({ limit: "10kb" }));

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Escape user-submitted content before inserting it into HTML.
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

// Backend health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Portfolio backend is running.",
  });
});

// Portfolio contact form
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof subject !== "string" ||
      typeof message !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !subject.trim() ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Please fill in all required fields.",
      });
    }

    if (
      name.length > 100 ||
      email.length > 254 ||
      subject.length > 150 ||
      message.length > 5000 ||
      (phone !== undefined && (typeof phone !== "string" || phone.length > 30))
    ) {
      return res.status(400).json({
        success: false,
        error: "One or more fields exceed the allowed length.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid email address.",
      });
    }

    if (
      !resend ||
      !process.env.CONTACT_EMAIL ||
      !process.env.RESEND_FROM_EMAIL
    ) {
      console.error("Required email environment variables are missing.");

      return res.status(500).json({
        success: false,
        error: "The contact service is not configured yet.",
      });
    }

    const safeName = escapeHtml(name.trim());
    const safeEmail = escapeHtml(email.trim());
    const safePhone = escapeHtml(
      typeof phone === "string" && phone.trim() ? phone.trim() : "Not provided",
    );
    const safeSubject = escapeHtml(subject.trim());
    const safeMessage = escapeHtml(message.trim()).replace(/\r?\n/g, "<br>");

    const { data: adminData, error: adminError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [process.env.CONTACT_EMAIL],
      replyTo: email.trim(),
      subject: `Portfolio enquiry: ${subject.trim()}`,
      html: `
      <div style="font-family:Arial,sans-serif;color:#29251f;padding:24px">
        <h2>New Portfolio Contact Message</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Phone:</strong> ${safePhone}</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      </div>
    `,
    });

    if (adminError) {
      console.error("Admin email error:", adminError);

      return res.status(502).json({
        success: false,
        error: "Unable to send your message right now. Please try again.",
      });
    }

    console.log("Portfolio notification email sent:", adminData?.id);

    // Send a confirmation email to the visitor.
    const { data: userData, error: userError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [email.trim()],
      replyTo: process.env.CONTACT_EMAIL,
      subject: "Thanks for reaching out, I've received your note",
      text: `Hi ${name.trim()},

Thank you for contacting me. I've received your message about "${subject.trim()}" and will get back to you within 1-2 business days.

While you wait, let's stay in touch:
LinkedIn: https://www.linkedin.com/in/prabin-nayak-14b51b322/
GitHub: https://github.com/Prabin833

Best regards,
Prabin Kumar Nayak
`,
      html: `
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">

<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Kalam:wght@400;700&family=Special+Elite&display=swap" rel="stylesheet">

<style>
  @media only screen and (max-width: 480px) {
    .email-wrapper {
      padding: 16px 8px !important;
    }

    .email-card {
      width: 100% !important;
    }

    .email-content {
      padding: 24px 16px 8px 16px !important;
    }

    .email-heading {
      font-size: 36px !important;
    }

    .email-body {
      font-size: 18px !important;
      line-height: 1.8 !important;
    }

    .email-note {
      font-size: 17px !important;
      line-height: 1.8 !important;
    }

    .email-signature {
      font-size: 30px !important;
    }

    .social-button {
      font-size: 14px !important;
      padding: 9px 12px !important;
    }

    .email-footer {
      font-size: 10px !important;
      line-height: 1.6 !important;
      padding: 0 8px !important;
    }
  }
</style>
</head>

<body style="margin:0;padding:0;background-color:#f8f3e7;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f3e7;">
<tr>
<td align="center" class="email-wrapper" style="padding:28px 12px;">

<table role="presentation" width="580" cellpadding="0" cellspacing="0" class="email-card" style="width:100%;max-width:580px;background-color:#fffaf0;border:1px solid #d8cdb8;">

<tr>

<td width="24" style="width:24px;border-right:2px solid #e2958c;font-size:0;line-height:0;">
&nbsp;
</td>

<td class="email-content" style="padding:30px 28px 8px 26px;">

<!-- Heading -->

<h1 class="email-heading" style="margin:0;font-family:'Caveat','Segoe Print','Bradley Hand','Comic Sans MS',cursive;font-size:44px;line-height:1.1;font-weight:700;color:#29251f;">
Thank you for<br>
reaching out<span style="color:#c65d4b;">!</span>
</h1>

<div style="width:150px;height:0;border-top:3px solid #c65d4b;margin:6px 0 22px 0;"></div>

<!-- Greeting -->

<p class="email-body" style="margin:0 0 14px 0;font-family:'Kalam','Segoe Print','Bradley Hand','Comic Sans MS',cursive;font-size:19px;line-height:1.8;color:#3d372f;">
Hi <strong style="color:#c65d4b;">${safeName}</strong>,
</p>

<!-- Main Message -->

<p class="email-body" style="margin:0 0 22px 0;font-family:'Kalam','Segoe Print','Bradley Hand','Comic Sans MS',cursive;font-size:18px;line-height:1.9;color:#51483e;">
Got your message! I'll check it out and get back to you soon.
</p>

<!-- Sticky Note -->

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px 0;">

<tr>
<td align="center" style="font-size:0;line-height:0;height:14px;">

<table role="presentation" cellpadding="0" cellspacing="0">
<tr>
<td width="70" height="14" style="width:70px;height:14px;background-color:#efe6c8;font-size:0;line-height:0;">
&nbsp;
</td>
</tr>
</table>

</td>
</tr>

<tr>
<td style="background-color:#fdf0a6;border:1px solid #e9d87a;padding:18px 18px;box-shadow:3px 4px 0 rgba(41,37,31,0.08);">

<p style="margin:0 0 10px 0;font-family:'Special Elite','Courier New',monospace;font-size:12px;letter-spacing:1.5px;color:#8a7a3a;">
YOUR NOTE
</p>

<p class="email-note" style="margin:0 0 10px 0;font-family:'Kalam','Segoe Print','Bradley Hand','Comic Sans MS',cursive;font-size:18px;line-height:1.7;color:#29251f;">
<strong>${safeSubject}</strong>
</p>

<p class="email-note" style="margin:0;font-family:'Kalam','Segoe Print','Bradley Hand','Comic Sans MS',cursive;font-size:17px;line-height:1.8;color:#4a432f;white-space:pre-wrap;overflow-wrap:anywhere;">
${safeMessage}
</p>

</td>
</tr>
</table>

<!-- Social Links Introduction -->

<p class="email-body" style="margin:0 0 14px 0;font-family:'Kalam','Segoe Print','Bradley Hand','Comic Sans MS',cursive;font-size:18px;line-height:1.9;color:#51483e;">
While you wait, let's stay in touch:
</p>

<!-- Social Buttons -->

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 26px 0;">

<tr>

<td style="padding:0 10px 10px 0;">

<a class="social-button"
href="https://www.linkedin.com/in/prabin-nayak-14b51b322/"
target="_blank"
style="display:inline-block;background-color:#29251f;color:#fffaf0;text-decoration:none;border:2px solid #29251f;padding:10px 20px;font-family:'Kalam','Segoe Print','Comic Sans MS',cursive;font-size:16px;font-weight:700;box-shadow:4px 4px 0 #c65d4b;">
Connect on LinkedIn &rarr;
</a>

</td>

<td style="padding:0 0 10px 0;">

<a class="social-button"
href="https://github.com/Prabin833"
target="_blank"
style="display:inline-block;color:#29251f;text-decoration:none;border:2px dashed #8a7863;padding:10px 20px;font-family:'Kalam','Segoe Print','Comic Sans MS',cursive;font-size:16px;">
See my GitHub
</a>

</td>

</tr>
</table>

<!-- Divider -->

<div style="border-top:1px dashed #d8cdb8;margin:0 0 18px 0;"></div>

<!-- Signature -->

<p class="email-body" style="margin:0 0 4px 0;font-family:'Kalam','Segoe Print','Bradley Hand','Comic Sans MS',cursive;font-size:18px;line-height:1.8;color:#51483e;">
Best regards,
</p>

<p class="email-signature" style="margin:0 0 2px 0;font-family:'Caveat','Segoe Print','Bradley Hand','Comic Sans MS',cursive;font-size:34px;line-height:1.1;font-weight:700;color:#c65d4b;">
Prabin Kumar Nayak
</p>

</td>
</tr>
</table>

<!-- Footer -->

<p class="email-footer" style="margin:14px 0 0 0;font-family:'Special Elite','Courier New',monospace;font-size:11px;line-height:1.6;letter-spacing:1px;color:#a3947d;text-align:center;">
You're receiving this because you used the contact form on my portfolio.
</p>

</td>
</tr>
</table>

</body>
</html>
`,
    });

    if (userError) {
      console.error("Confirmation email error:", userError);

      // The notification has already been sent successfully.
      return res.status(200).json({
        success: true,
        message:
          "Your message was received, but the confirmation email could not be sent.",
      });
    }

    console.log("Confirmation email sent:", userData?.id);

    return res.status(200).json({
      success: true,
      message: "Your message has been sent successfully!",
    });
  } catch (error) {
    console.error("Contact endpoint error:", error);

    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred. Please try again later.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Portfolio backend running on port ${PORT}`);
});
