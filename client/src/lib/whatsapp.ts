export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with 0 (UK mobile), replace with +44
  if (cleaned.startsWith('0')) {
    return '+44' + cleaned.substring(1);
  }
  
  // If it doesn't start with +, assume UK and add +44
  if (!cleaned.startsWith('+')) {
    return '+44' + cleaned;
  }
  
  return cleaned;
}

export function getWhatsAppLink(phone: string, message: string = ''): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = message ? `&text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${formattedPhone.replace('+', '')}${encodedMessage}`;
}

export function checkWhatsAppAvailable(phone: string): boolean {
  // Basic validation - WhatsApp requires phone numbers
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.length >= 10; // Minimum length for a valid phone number
}
