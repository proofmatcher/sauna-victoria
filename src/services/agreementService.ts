import handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Resolve __dirname in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AgreementData {
  customerName: string;
  deliveryAddress: string;
  customerEmail: string;
  customerPhone: string;
  agreementDate: string;
  capacity: string;
  dropoffDate: string;
  pickupDate: string;
  rentalFee: string;
}

export class AgreementService {
  private compiledTemplate: HandlebarsTemplateDelegate | null = null;

  constructor() {
    // Load template from local filesystem (works in Docker/Contabo)
    // The Dockerfile already copies src/templates → dist/templates
    // In dev: __dirname = src/services → ../templates
    // In prod (dist): __dirname = dist/services → ../templates
    const templatePath = join(__dirname, '../templates/equipment-rental-agreement-template.html');

    try {
      const templateContent = readFileSync(templatePath, 'utf-8');
      this.compiledTemplate = handlebars.compile(templateContent);
      console.log('✅ Agreement template loaded from local filesystem:', templatePath);
    } catch (error) {
      console.error('❌ Failed to load agreement template from:', templatePath, error);
      throw new Error(`Agreement template not found at ${templatePath}`);
    }
  }

  /**
   * Generate HTML content with customer data
   */
  async generateHTML(data: AgreementData): Promise<string> {
    if (!this.compiledTemplate) {
      throw new Error('Agreement template not compiled');
    }
    return this.compiledTemplate(data);
  }

  /**
   * Generate PDF from agreement data using system-installed Chromium.
   *
   * On Contabo (Docker/Alpine):
   *   - PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser  (set in Dockerfile)
   *
   * On local dev (Mac/Linux):
   *   - Uses puppeteer's bundled Chrome automatically (PUPPETEER_EXECUTABLE_PATH not set)
   */
  async generatePDF(data: AgreementData): Promise<Buffer> {
    console.log('🔵 [PDF Gen] Step 1: Generating HTML...');
    const startTime = Date.now();
    const html = await this.generateHTML(data);
    console.log(`✅ [PDF Gen] Step 1 done: HTML ready in ${Date.now() - startTime}ms`);

    // Resolve Chrome executable:
    //   - Docker/Contabo: PUPPETEER_EXECUTABLE_PATH env var points to system chromium
    //   - Local dev: undefined → puppeteer uses its own bundled Chrome
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

    console.log(
      `🔵 [PDF Gen] Step 2: Launching Puppeteer${executablePath ? ` (${executablePath})` : ' (bundled Chrome)'}...`
    );
    const browserStartTime = Date.now();

    const browser = await puppeteer.launch({
      headless: true,
      executablePath, // undefined in dev → puppeteer uses bundled Chrome
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
      timeout: 60000,
    });

    console.log(`✅ [PDF Gen] Step 2 done: Browser launched in ${Date.now() - browserStartTime}ms`);

    try {
      console.log('🔵 [PDF Gen] Step 3: Creating page and setting content...');
      const pageStart = Date.now();
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      console.log(`✅ [PDF Gen] Step 3 done: Page ready in ${Date.now() - pageStart}ms`);

      console.log('🔵 [PDF Gen] Step 4: Generating PDF bytes...');
      const pdfStart = Date.now();

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        timeout: 60000,
      });

      console.log(`✅ [PDF Gen] Step 4 done: PDF generated in ${Date.now() - pdfStart}ms`);
      console.log(`✅ [PDF Gen] COMPLETE — total: ${Date.now() - startTime}ms`);

      return Buffer.from(pdfBuffer);
    } finally {
      // Always close the browser, even on error
      await browser.close();
    }
  }

  /**
   * Validate agreement data
   */
  validateAgreementData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.customerName || typeof data.customerName !== 'string') {
      errors.push('customerName is required and must be a string');
    }

    if (!data.deliveryAddress || typeof data.deliveryAddress !== 'string') {
      errors.push('deliveryAddress is required and must be a string');
    }

    if (!data.customerEmail || typeof data.customerEmail !== 'string') {
      errors.push('customerEmail is required and must be a string');
    }

    if (!data.customerPhone || typeof data.customerPhone !== 'string') {
      errors.push('customerPhone is required and must be a string');
    }

    if (!data.agreementDate || typeof data.agreementDate !== 'string') {
      errors.push('agreementDate is required and must be a string');
    }

    if (!data.capacity || typeof data.capacity !== 'string') {
      errors.push('capacity is required and must be a string');
    } else if (!data.capacity.toLowerCase().includes('person')) {
      errors.push('capacity must include "person" (e.g., "4 person", "8 person")');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default new AgreementService();
