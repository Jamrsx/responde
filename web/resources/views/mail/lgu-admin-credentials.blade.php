<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Responde administrator account</title>
</head>
<body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#1e293b;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
        <div style="overflow:hidden;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
            <div style="background:#e0752e;padding:24px 28px;color:#ffffff;">
                <div style="font-size:22px;font-weight:700;">Responde</div>
                <div style="margin-top:4px;font-size:14px;">LGU administrator account</div>
            </div>

            <div style="padding:28px;">
                <p style="margin:0 0 16px;">Hello {{ $adminName }},</p>

                <p style="margin:0 0 20px;line-height:1.6;">
                    An administrator account was created for
                    <strong>{{ $lguName }}</strong>. Use the temporary
                    credentials below to sign in.
                </p>

                <div style="margin-bottom:22px;border:1px solid #fed7aa;border-radius:12px;background:#fff7ed;padding:18px;">
                    <div style="margin-bottom:10px;">
                        <div style="font-size:12px;color:#64748b;">Email</div>
                        <div style="margin-top:3px;font-weight:700;">{{ $emailAddress }}</div>
                    </div>
                    <div>
                        <div style="font-size:12px;color:#64748b;">Temporary password</div>
                        <div style="margin-top:3px;font-family:Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:1px;">{{ $temporaryPassword }}</div>
                    </div>
                </div>

                <p style="margin:0 0 22px;line-height:1.6;">
                    For security, sign in and change this temporary password
                    immediately. Do not share these credentials.
                </p>

                <a href="{{ $loginUrl }}" style="display:inline-block;border-radius:8px;background:#e0752e;padding:12px 20px;color:#ffffff;text-decoration:none;font-weight:700;">
                    Sign in to Responde
                </a>

                <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#64748b;">
                    If the button does not work, open:<br>
                    <a href="{{ $loginUrl }}" style="color:#c45f1f;">{{ $loginUrl }}</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
