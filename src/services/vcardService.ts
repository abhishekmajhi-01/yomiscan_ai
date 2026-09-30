export interface ContactInfo {
  name: string;
  company?: string;
  jobTitle?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  address?: string;
}

export class VCardService {
  static generateVCard(contact: ContactInfo): string {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contact.name || 'Contact'}`,
      `N:${contact.name ? contact.name.split(' ').reverse().join(';') : 'Contact;;;'}`,
    ];

    if (contact.company) lines.push(`ORG:${contact.company}`);
    if (contact.jobTitle) lines.push(`TITLE:${contact.jobTitle}`);
    if (contact.phoneNumber) lines.push(`TEL;TYPE=CELL:${contact.phoneNumber}`);
    if (contact.email) lines.push(`EMAIL;TYPE=WORK:${contact.email}`);
    if (contact.website) lines.push(`URL:${contact.website}`);
    if (contact.address) lines.push(`ADR;TYPE=WORK:;;${contact.address};;;;`);

    lines.push('NOTE:Scanned and saved using YomiScan');
    lines.push('END:VCARD');

    return lines.join('\r\n');
  }

  static downloadVCard(contact: ContactInfo) {
    const vcf = this.generateVCard(contact);
    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(contact.name || 'contact').replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
