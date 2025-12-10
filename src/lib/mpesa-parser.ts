import { ParsedPayment } from "@/types";

/**
 * Parse M-Pesa SMS text and extract payment information
 * Typical M-Pesa format:
 * "RLC1234567 Confirmed. Ksh25,000.00 received from JOHN KAMAU 0712345678 on 15/12/24 at 3:45 PM..."
 * or
 * "RLC1234567 Confirmed. You have received Ksh25,000.00 from JOHN KAMAU 0712345678 on 15/12/24..."
 */
export function parseMpesaText(text: string): ParsedPayment[] {
  const payments: ParsedPayment[] = [];
  
  // Split by transaction codes (RLC, QLC, etc. - common M-Pesa prefixes)
  const transactionRegex = /([A-Z]{2,3}[0-9A-Z]{7,10})\s+Confirmed/gi;
  const sections = text.split(transactionRegex);
  
  // Process the text as a whole if no clear sections
  const textBlocks = sections.length > 1 ? sections : [text];
  
  for (const block of textBlocks) {
    // Extract M-Pesa code
    const codeMatch = block.match(/([A-Z]{2,3}[0-9A-Z]{7,10})/i);
    const mpesaCode = codeMatch ? codeMatch[1].toUpperCase() : undefined;
    
    // Extract amount (handles formats like: Ksh25,000.00, Ksh 25000, KES 25,000)
    const amountMatch = block.match(/(?:Ksh|KES|Kshs?)\s*([\d,]+(?:\.\d{2})?)/i);
    if (!amountMatch) continue;
    
    const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0) continue;
    
    // Extract phone number (Kenyan format: 07XX, 01XX, 254XXX)
    const phoneMatches = block.match(/(?:254|\+254|0)?([17]\d{8})/g);
    
    if (phoneMatches) {
      for (const phoneMatch of phoneMatches) {
        // Normalize to 0XXXXXXXXX format
        let phone = phoneMatch.replace(/^\+?254/, "0");
        if (!phone.startsWith("0")) {
          phone = "0" + phone;
        }
        
        // Only add if we haven't already captured this exact transaction
        const isDuplicate = payments.some(
          p => p.phone === phone && p.amount === amount && p.mpesaCode === mpesaCode
        );
        
        if (!isDuplicate) {
          payments.push({
            phone,
            amount,
            mpesaCode,
            rawText: block.slice(0, 100),
          });
        }
      }
    }
  }
  
  return payments;
}

/**
 * Normalize phone number to consistent format (0XXXXXXXXX)
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return cleaned.replace(/^\+?254/, "0");
}

/**
 * Check if two phone numbers match (handles different formats)
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  return normalizePhone(phone1) === normalizePhone(phone2);
}
