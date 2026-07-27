export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
}

export function escapeHtml(unsafe: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return unsafe.replace(/[&<>"']/g, (m) => map[m]);
}

export function sanitizePrompt(input: string): string {
    const sanitized = sanitizeInput(input);
    const dangerousPatterns = [
        /ignore\s+previous\s+instructions/i,
        /ignore\s+all\s+prior\s+commands/i,
        /system\s*:/i,
        /you\s+are/i,
        /pretend\s+to\s+be/i,
        /bypass/i,
    ];
    
    let result = sanitized;
    for (const pattern of dangerousPatterns) {
        result = result.replace(pattern, '[FILTERED]');
    }
    
    return result;
}

export function validateUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

export function truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}