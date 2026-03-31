export const mktTemplateHtml = `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>{{nazev_akce}}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f7fb;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 60px rgba(15,23,42,0.12);">
            <tr>
              <td style="padding:0;background:#0f172a;">
                <img src="{{image_url}}" alt="Fotografie akce" style="display:block;width:100%;height:260px;object-fit:cover;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 18px 28px;background:linear-gradient(135deg,#0f172a,#334155);color:#ffffff;">
                <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">
                  {{t_invitation}}
                </div>
                <div style="font-size:28px;line-height:1.2;font-weight:800;margin:10px 0 0 0;">
                  {{nazev_akce}}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 0 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:0 0 12px 0;">
                      <span style="display:inline-block;background:#eef2ff;color:#1e3a8a;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:600;margin:0 8px 8px 0;">
                        {{t_place}}: {{misto_konani}}
                      </span>
                      <span style="display:inline-block;background:#ecfeff;color:#155e75;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:600;margin:0 8px 8px 0;">
                        {{t_start}}: {{zacatek_akce}}
                      </span>
                      <span style="display:inline-block;background:#f1f5f9;color:#0f172a;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:600;margin:0 8px 8px 0;">
                        {{t_end}}: {{konec_akce}}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 28px 8px 28px;">
                <div style="font-size:16px;line-height:1.6;color:#0f172a;">
                  <div style="font-size:18px;font-weight:800;margin:14px 0 8px 0;">
                    {{t_description}}
                  </div>
                  <div style="padding:14px 16px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;">
                    {{popis}}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 26px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <div style="font-size:12px;line-height:1.6;color:#64748b;">
                  OREA Hotels s.r.o.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
