interface EmailAttachment {
    filename: string;
    content: Buffer;
    contentType?: string;
}
export declare const sendEmail: (to: string, subject: string, html: string, attachments?: EmailAttachment[]) => Promise<void>;
export {};
