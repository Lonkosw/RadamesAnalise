// ============================================================================
// emailService.js - Serviço de Envio de E-mails
// HabibPerfumeShop - Usando NodeMailer
// ============================================================================

const nodemailer = require('nodemailer');

// Carregar variáveis de ambiente
require('dotenv').config();

// Configuração do transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verificar conexão com o serviço de email
transporter.verify((error, success) => {
  if (error) {
    console.log('⚠️ Email Service: Não configurado ou erro de conexão');
    console.log('   Configure EMAIL_USER e EMAIL_PASS no arquivo .env');
  } else {
    console.log('✅ Email Service: Pronto para enviar emails');
  }
});

/**
 * Envia email de recuperação de senha com código de 6 dígitos
 * @param {string} destinatario - Email do destinatário
 * @param {string} nome - Nome do usuário
 * @param {string} codigo - Código de 6 dígitos
 * @returns {Promise<object>} - Resultado do envio
 */
async function enviarCodigoRecuperacao(destinatario, nome, codigo) {
  const mailOptions = {
    from: {
      name: 'Habib Perfume Shop',
      address: process.env.EMAIL_USER
    },
    to: destinatario,
    subject: '🔐 Código de Recuperação de Senha - Habib Perfume Shop',
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1A1A1A;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1A1A1A; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2B2B2B; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #8B0000, #720000); padding: 30px; text-align: center;">
                    <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 600;">
                      🌸 Habib Perfume Shop
                    </h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">
                      Recuperação de Senha
                    </p>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #F5F5F5; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Olá <strong>${nome}</strong>,
                    </p>
                    <p style="color: #E0E0E0; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                      Recebemos uma solicitação para redefinir sua senha. Use o código abaixo para continuar:
                    </p>
                    
                    <!-- Código -->
                    <div style="background: linear-gradient(135deg, #8B0000, #720000); border-radius: 12px; padding: 25px; text-align: center; margin: 0 auto 30px;">
                      <p style="color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px;">
                        Seu código de verificação
                      </p>
                      <p style="color: #FFFFFF; font-size: 42px; font-weight: 700; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                        ${codigo}
                      </p>
                    </div>
                    
                    <!-- Aviso de expiração -->
                    <div style="background: rgba(255, 193, 7, 0.15); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 25px;">
                      <p style="color: #ffc107; font-size: 14px; margin: 0; text-align: center;">
                        ⏰ <strong>Este código expira em 5 minutos</strong>
                      </p>
                    </div>
                    
                    <p style="color: #888888; font-size: 13px; line-height: 1.6; margin: 0;">
                      Se você não solicitou esta recuperação de senha, por favor ignore este email. Sua conta permanecerá segura.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #1A1A1A; padding: 20px 30px; border-top: 1px solid #3A3A3A;">
                    <p style="color: #666666; font-size: 12px; margin: 0; text-align: center;">
                      © 2025 Habib Perfume Shop. Todos os direitos reservados.
                    </p>
                    <p style="color: #555555; font-size: 11px; margin: 10px 0 0; text-align: center;">
                      Este é um email automático. Por favor, não responda.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Habib Perfume Shop - Recuperação de Senha

Olá ${nome},

Recebemos uma solicitação para redefinir sua senha.

Seu código de verificação é: ${codigo}

⚠️ Este código expira em 5 minutos.

Se você não solicitou esta recuperação, ignore este email.

© 2025 Habib Perfume Shop
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  enviarCodigoRecuperacao,
  transporter
};
