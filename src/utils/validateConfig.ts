/**
 * Validate critical environment variables on startup
 * Logs warnings for missing configurations
 */
export const validateEmailConfig = (): void => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const frontendUrl = process.env.FRONTEND_URL;

  console.log('\n🔍 Validating Email Configuration...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const warnings: string[] = [];
  const info: string[] = [];

  // Check EMAIL_USER
  if (!emailUser) {
    warnings.push('❌ EMAIL_USER is not set - Email functionality will not work');
  } else {
    info.push(`✅ EMAIL_USER: ${emailUser}`);
  }

  // Check email method (SMTP or Gmail)
  if (smtpHost) {
    info.push(`✅ SMTP_HOST: ${smtpHost}`);
    info.push(`✅ SMTP_PORT: ${smtpPort || '587 (default)'}`);
    info.push(`✅ SMTP_SECURE: ${process.env.SMTP_SECURE || 'false (default)'}`);
    
    if (!emailPass) {
      info.push('ℹ️  SMTP authentication: IP-based (no password)');
    } else {
      info.push('✅ SMTP authentication: Password-based');
    }
  } else {
    if (!emailPass) {
      warnings.push('❌ Neither SMTP_HOST nor EMAIL_PASS is set - Email will not work');
    } else {
      info.push('✅ Using Gmail service with App Password');
    }
  }

  // Check FRONTEND_URL for verification links
  if (!frontendUrl) {
    warnings.push('⚠️  FRONTEND_URL is not set - Email verification links may be incorrect');
  } else {
    info.push(`✅ FRONTEND_URL: ${frontendUrl}`);
  }

  // Display results
  info.forEach(msg => console.log(msg));
  warnings.forEach(msg => console.warn(msg));
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Don't throw errors, just warn - allow app to start
  if (warnings.length > 0) {
    console.warn('⚠️  Email configuration issues detected. Please fix for production use.\n');
  }
};

/**
 * Validate image upload configuration
 */
export const validateImageConfig = (): void => {
  const uploadsPath = process.cwd() + '/uploads';
  console.log('🖼️  Image uploads directory:', uploadsPath);
  console.log('ℹ️  Ensure this directory is:\n   - Writable by the Node.js process\n   - Served by Nginx in production\n   - Backed by a persistent Docker volume\n');
};
