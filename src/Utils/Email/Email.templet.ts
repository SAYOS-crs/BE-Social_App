export enum EmailType {
  ForgetPassword = "Forget Password OTP",
  ConfirmEmail = "Confirm Email OTP",
  WellcomeEmail = "Wellcome to Social App",
}

export const HtmlTemplet = ({
  OTP,
  EmailType,
}: {
  OTP: string;
  EmailType: EmailType;
}) => {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${EmailType}</title>
      <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; text-align: center; padding: 30px 20px; }
          .content { padding: 40px 30px; text-align: center; }
          .otp-code {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
              color: #1e2937;
          }
          .button {
              display: inline-block;
              background: #4f46e5;
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
              font-weight: 600;
          }
          .footer {
              background: #f8fafc;
              padding: 25px;
              text-align: center;
              font-size: 14px;
              color: #64748b;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <!-- Header -->
          <div class="header">
              <h1>Social App</h1>
          </div>

          <!-- Content -->
          <div class="content">
              <h2>Verify Your Email</h2>
              <p style="color: #475569; font-size: 16px; margin: 20px 0;">
                  Use the following code to complete your sign-up:
              </p>

              <div class="otp-code">
                  ${OTP}
              </div>


              <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                  If you didn't request this code, please ignore this email.
              </p>
          </div>

          <!-- Footer -->
          <div class="footer">
              <p>© 2026 Your Social App. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
          </div>
      </div>
  </body>
  </html>`;
};
