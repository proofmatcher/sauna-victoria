import handlebars from 'handlebars';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import axios from 'axios';

interface AgreementData {
  customerName: string;
  deliveryAddress: string;
  customerEmail: string;
  customerPhone: string;
  agreementDate: string;
  capacity: string; // Changed from '4 person' | '8 person' to accept any capacity format
  dropoffDate: string;
  pickupDate: string;
  rentalFee: string;
}

export class AgreementService {
  private templateUrl: string;
  private compiledTemplate: HandlebarsTemplateDelegate | null = null;
  private templateCache: string | null = null;

  constructor() {
    // Store template in Cloudinary to avoid filesystem issues in serverless environments
    this.templateUrl = 'https://res.cloudinary.com/dobgcxfdi/raw/upload/v1769522801/templates/equipment-rental-agreement.html';
  }

  /**
   * Load and compile the Handlebars template from Cloudinary
   */
  private async loadTemplate(): Promise<HandlebarsTemplateDelegate> {
    if (this.compiledTemplate) {
      return this.compiledTemplate;
    }

    try {
      console.log('📥 Fetching template from Cloudinary...');
      const response = await axios.get(this.templateUrl);
      this.templateCache = response.data;
      this.compiledTemplate = handlebars.compile(this.templateCache);
      console.log('✅ Template loaded and compiled successfully');
      return this.compiledTemplate;
    } catch (error) {
      console.error('❌ Error loading template from Cloudinary:', error);
      throw new Error(`Failed to load agreement template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate HTML content with customer data
   */
  async generateHTML(data: AgreementData): Promise<string> {
    const template = await this.loadTemplate();
    return template(data);
  }

  /**
   * Generate PDF from agreement data
   */
  async generatePDF(data: AgreementData): Promise<Buffer> {
    console.log('🔵 [PDF Gen] Step 1: Starting HTML generation...');
    const startTime = Date.now();
    const html = await this.generateHTML(data);
    console.log(`✅ [PDF Gen] Step 1 Complete: HTML generated in ${Date.now() - startTime}ms`);
    
    console.log('🔵 [PDF Gen] Step 2: Launching Puppeteer browser...');
    const browserStartTime = Date.now();
    let browser;
    try {
      // Detect environment: production (Vercel) vs development (local)
      const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
      
      if (isProduction) {
        console.log('🌐 Running in PRODUCTION mode (Vercel serverless)');
        // Use @sparticuz/chromium for serverless environments with optimized settings
        browser = await puppeteer.launch({
          args: [
            ...chromium.args,
            '--single-process',
            '--no-zygote',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
          ],
          defaultViewport: { width: 1920, height: 1080 },
          executablePath: await chromium.executablePath(),
          headless: true,
          timeout: 60000, // 60 seconds for browser launch
        });
      } else {
        console.log('💻 Running in DEVELOPMENT mode (local)');
        // Use regular puppeteer for local development (dynamic import for ESM compatibility)
        const puppeteerModule = await import('puppeteer');
        const puppeteerRegular = puppeteerModule.default;
        browser = await puppeteerRegular.launch({
          headless: true,
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
      }
      console.log(`✅ [PDF Gen] Step 2 Complete: Browser launched in ${Date.now() - browserStartTime}ms`);
    } catch (error) {
      console.error(`❌ [PDF Gen] Step 2 FAILED: Browser launch failed after ${Date.now() - browserStartTime}ms`, error);
      throw error;
    }

    try {
      console.log('🔵 [PDF Gen] Step 3: Creating new page...');
      const pageStartTime = Date.now();
      const page = await browser.newPage();
      console.log(`✅ [PDF Gen] Step 3 Complete: Page created in ${Date.now() - pageStartTime}ms`);
      
      console.log('🔵 [PDF Gen] Step 4: Setting page content...');
      const contentStartTime = Date.now();
      await page.setContent(html, {
        waitUntil: 'domcontentloaded', // Changed from networkidle0 for faster loading
        timeout: 60000, // Increased to 60 seconds
      });
      console.log(`✅ [PDF Gen] Step 4 Complete: Content set in ${Date.now() - contentStartTime}ms`);

      console.log('🔵 [PDF Gen] Step 5: Generating PDF...');
      const pdfStartTime = Date.now();
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
        timeout: 60000, // 60 seconds for PDF generation
      });
      console.log(`✅ [PDF Gen] Step 5 Complete: PDF generated in ${Date.now() - pdfStartTime}ms`);
      console.log(`✅ [PDF Gen] COMPLETE: Total time ${Date.now() - startTime}ms`);

      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error(`❌ [PDF Gen] FAILED at some step:`, error);
      throw error;
    } finally {
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
