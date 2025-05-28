// Utilitários compartilhados
export class PlacaUtils {
  static formatPlaca(placa: string): string {
    return placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }
  
  static validatePlaca(placa: string): boolean {
    const formatted = this.formatPlaca(placa);
    const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
    const mercosulFormat = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
    return oldFormat.test(formatted) || mercosulFormat.test(formatted);
  }
  
  static getPlacaType(placa: string): 'old' | 'mercosul' | 'invalid' {
    const formatted = this.formatPlaca(placa);
    if (/^[A-Z]{3}[0-9]{4}$/.test(formatted)) return 'old';
    if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(formatted)) return 'mercosul';
    return 'invalid';
  }
}

export class DateUtils {
  static now(): string {
    return new Date().toISOString();
  }
  
  static formatBrazilian(date: string): string {
    return new Date(date).toLocaleString('pt-BR');
  }
}

export class LogUtils {
  static formatMessage(level: string, component: string, message: string): string {
    const timestamp = DateUtils.now();
    return `[${timestamp}] [${level.toUpperCase()}] [${component}] ${message}`;
  }
}