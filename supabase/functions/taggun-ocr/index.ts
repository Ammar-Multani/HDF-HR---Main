import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Environment variables
const NODE_ENV = Deno.env.get("NODE_ENV") || "production";
const TAGGUN_API_KEY = Deno.env.get("TAGGUN_API_KEY") || "";
const TAGGUN_API_URL = "https://api.taggun.io/api/receipt/v1/verbose/file";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Define interfaces for Taggun response
interface TaggunLocation {
  city: { data?: string; confidenceLevel: number };
  continent: { data?: string; confidenceLevel: number };
  country: {
    data?: string;
    confidenceLevel: number;
    iso_code?: string;
    names?: { [key: string]: string };
  };
  postal: { data?: string; confidenceLevel: number };
}

interface TaggunEntity {
  data: string | number;
  confidenceLevel: number;
  text?: string;
  index?: number;
  regions?: any[];
  currencyCode?: string;
}

interface TaggunProductLineItem {
  data: {
    name: { data: string };
    quantity: { data: number };
    unitPrice: { data: number };
    totalPrice: { data: number };
    sku?: { data: string };
  };
  confidenceLevel: number;
  text: string;
  index: number;
  regions: any[];
}

interface TaggunResponse {
  location: TaggunLocation;
  totalAmount: TaggunEntity;
  taxAmount: TaggunEntity;
  discountAmount: { confidenceLevel: number };
  paidAmount: TaggunEntity;
  date: TaggunEntity;
  dueDate: { confidenceLevel: number };
  merchantName: TaggunEntity;
  merchantAddress: TaggunEntity;
  merchantCity: TaggunEntity;
  merchantCountryCode: TaggunEntity;
  merchantPostalCode: TaggunEntity;
  merchantState: TaggunEntity;
  merchantTaxId: TaggunEntity;
  merchantTypes: { confidenceLevel: number };
  paymentType: { confidenceLevel: number };
  itemsCount: { data: number; confidenceLevel: number };
  entities: {
    productLineItems: TaggunProductLineItem[];
    IBAN: { data?: string; confidenceLevel: number };
    invoiceNumber: TaggunEntity;
    receiptNumber: TaggunEntity;
    multiTaxLineItems: any[];
    roundingAmount?: TaggunEntity;
    merchantTaxId?: TaggunEntity;
  };
  text: {
    text: string;
    regions: any[];
  };
  amounts: any[];
  lineAmounts: any[];
  numbers: any[];
  confidenceLevel: number;
  elapsed: number;
  targetRotation: number;
  trackingId: string;
}

async function processReceiptWithTaggun(fileBlob: Blob, options: any = {}) {
  if (!TAGGUN_API_KEY) {
    throw new Error("Taggun API key is not configured");
  }

  // Create form data with optimal parameters
  const formData = new FormData();
  formData.append(
    "file",
    fileBlob,
    options.filename || "receipt.jpg"
  );

  // Add Taggun parameters
  formData.append("extractLineItems", "true");
  formData.append("extractTime", "true");
  formData.append("language", options.language || "de");
  formData.append("refresh", "true");
  formData.append("incognito", "false");
  formData.append("near", options.near || "Switzerland");

  // Call Taggun API
  const ocrResponse = await fetch(TAGGUN_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      apikey: TAGGUN_API_KEY,
    },
    body: formData,
  });

  if (!ocrResponse.ok) {
    const errorText = await ocrResponse.text();
    throw new Error(`OCR processing failed: ${ocrResponse.statusText} - ${errorText}`);
  }

  return await ocrResponse.json();
}

// Helper function for proper rounding
function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function formatAmount(amount: number): string {
  return roundToTwoDecimals(amount).toFixed(2);
}

// Process and format the OCR response
function formatOcrResponse(ocrData: TaggunResponse) {
  // Extract VAT number with improved pattern matching
  const extractVatNumber = (text: string) => {
    const vatPatterns = [
      /(?:MWST|USt|VAT|UID)[-.]?(?:Nr\.?|Nummer)?[:\s]*(CHE-?[\d.-]+)/i,
      /(?:MWST|USt|VAT|UID)[-.]?(?:Nr\.?|Nummer)?[:\s]*([\d.-]{6,})/i,
      /(CHE-?[\d.-]+)/i,
      /(?:TVA|MWST|VAT)\s*(?:No\.?|Nr\.?|Nummer)?[:\s]*(\d{3,}(?:[.-]\d+)*)/i,
    ];

    for (const pattern of vatPatterns) {
      const match = text?.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  };

  // Extract phone number from text using regex
  const extractPhoneNumber = (text: string) => {
    const phoneRegex = /(?:Tel|Phone|T)(?::|.)?[\s-]*([+\d\s-()]{8,})/i;
    const phoneMatch = text?.match(phoneRegex);
    return phoneMatch?.[1]?.trim() || null;
  };

  // Extract website from text using regex
  const extractWebsite = (text: string) => {
    const websiteRegex =
      /(?:www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|https?:\/\/[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i;
    const websiteMatch = text?.match(websiteRegex);
    return websiteMatch?.[0]?.trim() || null;
  };

  // Format VAT details for display
  const formatVatDetails = (ocrData: TaggunResponse) => {
    if (!ocrData.entities?.multiTaxLineItems?.length) {
      // Fallback: Try to calculate VAT from total and tax amounts
      const total = roundToTwoDecimals(
        parseFloat(String(ocrData.totalAmount?.data || "0"))
      );
      const tax = roundToTwoDecimals(
        parseFloat(String(ocrData.taxAmount?.data || "0"))
      );

      if (!isNaN(total) && !isNaN(tax) && total > 0 && tax > 0) {
        const base = roundToTwoDecimals(total - tax);
        const rate = roundToTwoDecimals((tax / base) * 100);

        return `MwSt ${rate.toFixed(1)}%\nBasis: CHF ${formatAmount(base)}\nMwSt: CHF ${formatAmount(tax)}\nTotal: CHF ${formatAmount(total)}`;
      }
      
      return null;
    }

    const vatDetailsText = ocrData.entities.multiTaxLineItems
      .map((vat) => {
        // Try to get values from different possible locations in the data structure
        const base = roundToTwoDecimals(
          parseFloat(
            String(
              vat.base ||
                vat.data?.base ||
                vat.data?.grossAmount?.data ||
                "0"
            )
          )
        );
        const rate = roundToTwoDecimals(
          parseFloat(
            String(
              vat.rate || vat.data?.rate || vat.data?.taxRate?.data || "0"
            )
          ) * (vat.data?.taxRate?.data ? 100 : 1)
        );

        if (isNaN(base) || isNaN(rate) || base === 0 || rate === 0) {
          return null;
        }

        const vatAmount = roundToTwoDecimals((base * rate) / 100);
        const total = roundToTwoDecimals(base + vatAmount);

        return `MwSt ${rate.toFixed(1)}%\nBasis: CHF ${formatAmount(base)}\nMwSt: CHF ${formatAmount(vatAmount)}\nTotal: CHF ${formatAmount(total)}`;
      })
      .filter(Boolean)
      .join("\n\n");

    return vatDetailsText || null;
  };

  // Format line items
  const formatLineItems = (ocrData: TaggunResponse) => {
    if (!ocrData.entities?.productLineItems?.length) {
      return [];
    }

    return ocrData.entities.productLineItems.map((item) => ({
      name: item.data.name.data,
      quantity: item.data.quantity.data,
      unitPrice: item.data.unitPrice.data,
      totalPrice: item.data.totalPrice.data,
    }));
  };

  // Create formatted response
  const formattedResponse = {
    receipt_number: ocrData.entities?.receiptNumber?.data ? String(ocrData.entities.receiptNumber.data) : null,
    total_amount: ocrData.totalAmount?.data ? formatAmount(Number(ocrData.totalAmount.data)) : null,
    tax_amount: ocrData.taxAmount?.data ? formatAmount(Number(ocrData.taxAmount.data)) : null,
    merchant_name: ocrData.merchantName?.data ? String(ocrData.merchantName.data) : null,
    merchant_address: ocrData.merchantAddress?.data ? String(ocrData.merchantAddress.data) : null,
    date: ocrData.date?.data ? new Date(ocrData.date.data).toISOString() : null,
    paid_amount: ocrData.paidAmount?.data ? formatAmount(Number(ocrData.paidAmount.data)) : null,
    merchant_vat: extractVatNumber(ocrData.text?.text) || (ocrData.merchantTaxId?.data ? String(ocrData.merchantTaxId.data) : null),
    merchant_phone: extractPhoneNumber(ocrData.text?.text),
    merchant_website: extractWebsite(ocrData.text?.text),
    vat_details: formatVatDetails(ocrData),
    line_items: formatLineItems(ocrData),
    confidence_level: ocrData.confidenceLevel,
    raw_text: ocrData.text?.text,
    // Calculate additional fields
    subtotal_amount: ocrData.entities?.productLineItems?.length > 0 ?
      formatAmount(
        roundToTwoDecimals(
          ocrData.entities.productLineItems.reduce(
            (sum, item) => sum + (Number(item.data.totalPrice?.data) || 0),
            0
          )
        )
      ) : null,
    change_amount: (ocrData.paidAmount?.data && ocrData.totalAmount?.data) ?
      (() => {
        const paidAmount = Number(ocrData.paidAmount.data);
        const totalAmount = Number(ocrData.totalAmount.data);
        const change = roundToTwoDecimals(paidAmount - totalAmount);
        return change > 0 ? formatAmount(change) : null;
      })() : null,
  };

  return formattedResponse;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Headers":
          "*, authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Verify request method
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    // Get the file from the request
    const formData = await req.formData();
    const file = formData.get("file");
    
    if (!file || !(file instanceof Blob)) {
      throw new Error("No file provided or invalid file");
    }

    // Get additional options
    const language = formData.get("language") || "de";
    const near = formData.get("near") || "Switzerland";
    const filename = formData.get("filename") || "receipt.jpg";

    // Process with Taggun OCR
    const ocrData = await processReceiptWithTaggun(file, {
      language,
      near,
      filename: String(filename),
    });

    // Format the OCR response
    const formattedResponse = formatOcrResponse(ocrData);

    return new Response(
      JSON.stringify({
        success: true,
        data: formattedResponse,
        raw_data: ocrData,
        environment: NODE_ENV,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Function error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack,
        environment: NODE_ENV,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});