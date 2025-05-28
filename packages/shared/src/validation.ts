// ============================================================================
// SISTEMA DE VALIDAÇÃO DE DADOS COMPARTILHADO
// ============================================================================

import type {
  Pessoa,
  Veiculo,
  SessaoConsulta,
  ConfiguracaoSistema
} from './database';
import type { ConsultaResult } from './interfaces';


// ============================================================================
// INTERFACES PARA VALIDAÇÃO
// ============================================================================

export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'email' | 'cpf' | 'placa';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any, data: Partial<T>) => boolean | string;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

export interface ValidationSchema<T> {
  rules: ValidationRule<T>[];
  validate(data: Partial<T>): ValidationResult;
}

// ============================================================================
// UTILITÁRIOS DE VALIDAÇÃO
// ============================================================================

export class ValidationUtils {

  // Validar CPF
  static validateCPF(cpf: string): boolean {
    if (!cpf) return false;

    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/[^\d]/g, '');

    // Verifica se tem 11 dígitos
    if (cleanCPF.length !== 11) return false;

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;

    if (parseInt(cleanCPF.charAt(9)) !== digit1) return false;

    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;

    return parseInt(cleanCPF.charAt(10)) === digit2;
  }

  // Validar placa (formato antigo e Mercosul)
  static validatePlaca(placa: string): { valid: boolean; format: 'old' | 'mercosul' | 'invalid' } {
    if (!placa) return { valid: false, format: 'invalid' };

    const cleanPlaca = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Formato antigo: ABC1234
    const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
    if (oldFormat.test(cleanPlaca)) {
      return { valid: true, format: 'old' };
    }

    // Formato Mercosul: ABC1D23
    const mercosulFormat = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
    if (mercosulFormat.test(cleanPlaca)) {
      return { valid: true, format: 'mercosul' };
    }

    return { valid: false, format: 'invalid' };
  }

  // Validar email
  static validateEmail(email: string): boolean {
    if (!email) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validar telefone brasileiro
  static validateTelefone(telefone: string): boolean {
    if (!telefone) return false;

    const cleanTelefone = telefone.replace(/[^\d]/g, '');

    // Aceita formatos: 11999999999, 1199999999, 99999999
    return /^(\d{2})?\d{8,9}$/.test(cleanTelefone);
  }

  // Validar CEP
  static validateCEP(cep: string): boolean {
    if (!cep) return false;

    const cleanCEP = cep.replace(/[^\d]/g, '');
    return /^\d{8}$/.test(cleanCEP);
  }

  // Formatar CPF
  static formatCPF(cpf: string): string {
    const cleanCPF = cpf.replace(/[^\d]/g, '');
    if (cleanCPF.length === 11) {
      return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  }

  // Formatar placa
  static formatPlaca(placa: string): string {
    const cleanPlaca = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    if (cleanPlaca.length === 7) {
      // Formato antigo: ABC1234 -> ABC-1234
      if (/^[A-Z]{3}[0-9]{4}$/.test(cleanPlaca)) {
        return cleanPlaca.replace(/([A-Z]{3})([0-9]{4})/, '$1-$2');
      }
      // Formato Mercosul: ABC1D23 -> ABC1D23
      if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(cleanPlaca)) {
        return cleanPlaca;
      }
    }

    return placa;
  }

  // Formatar telefone
  static formatTelefone(telefone: string): string {
    const cleanTelefone = telefone.replace(/[^\d]/g, '');

    if (cleanTelefone.length === 11) {
      return cleanTelefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleanTelefone.length === 10) {
      return cleanTelefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }

    return telefone;
  }

  // Validar se string não está vazia
  static isNotEmpty(value: any): boolean {
    return value !== null && value !== undefined && String(value).trim().length > 0;
  }

  // Validar se é número válido
  static isValidNumber(value: any, min?: number, max?: number): boolean {
    const num = Number(value);
    if (isNaN(num)) return false;

    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;

    return true;
  }
}

// ============================================================================
// CLASSE PRINCIPAL DE VALIDAÇÃO
// ============================================================================

export class Validator<T> {
  private rules: ValidationRule<T>[] = [];

  constructor(rules: ValidationRule<T>[]) {
    this.rules = rules;
  }

  validate(data: Partial<T>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    for (const rule of this.rules) {
      const fieldName = rule.field as string;
      const value = data[rule.field];

      // Verificar se campo obrigatório está presente
      if (rule.required && !ValidationUtils.isNotEmpty(value)) {
        errors.push({
          field: fieldName,
          message: rule.message || `Campo ${fieldName} é obrigatório`,
          value
        });
        continue;
      }

      // Se campo não é obrigatório e está vazio, pular validações
      if (!rule.required && !ValidationUtils.isNotEmpty(value)) {
        continue;
      }

      // Validar tipo
      if (rule.type && !this.validateType(value, rule.type)) {
        errors.push({
          field: fieldName,
          message: rule.message || `Campo ${fieldName} deve ser do tipo ${rule.type}`,
          value
        });
        continue;
      }

      // Validar comprimento mínimo (CORRIGIDO)
      if (rule.minLength && value && String(value).length < rule.minLength) {
        errors.push({
          field: fieldName,
          message: rule.message || `Campo ${fieldName} deve ter pelo menos ${rule.minLength} caracteres`,
          value
        });
      }

      // Validar comprimento máximo (CORRIGIDO)
      if (rule.maxLength && value && String(value).length > rule.maxLength) {
        errors.push({
          field: fieldName,
          message: rule.message || `Campo ${fieldName} deve ter no máximo ${rule.maxLength} caracteres`,
          value
        });
      }

      // Validar valor mínimo
      if (rule.min !== undefined && !ValidationUtils.isValidNumber(value, rule.min)) {
        errors.push({
          field: fieldName,
          message: rule.message || `Campo ${fieldName} deve ser maior ou igual a ${rule.min}`,
          value
        });
      }

      // Validar valor máximo
      if (rule.max !== undefined && !ValidationUtils.isValidNumber(value, undefined, rule.max)) {
        errors.push({
          field: fieldName,
          message: rule.message || `Campo ${fieldName} deve ser menor ou igual a ${rule.max}`,
          value
        });
      }

      // Validar padrão regex (CORRIGIDO)
      if (rule.pattern && value && !rule.pattern.test(String(value))) {
        errors.push({
          field: fieldName,
          message: rule.message || `Campo ${fieldName} não atende ao padrão exigido`,
          value
        });
      }

      // Validação customizada
      if (rule.custom) {
        const customResult = rule.custom(value, data);
        if (customResult !== true) {
          errors.push({
            field: fieldName,
            message: typeof customResult === 'string' ? customResult : (rule.message || `Campo ${fieldName} é inválido`),
            value
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      case 'email':
        return typeof value === 'string' && ValidationUtils.validateEmail(value);
      case 'cpf':
        return typeof value === 'string' && ValidationUtils.validateCPF(value);
      case 'placa':
        return typeof value === 'string' && ValidationUtils.validatePlaca(value).valid;
      default:
        return true;
    }
  }
}

// ============================================================================
// SCHEMAS DE VALIDAÇÃO PRÉ-DEFINIDOS
// ============================================================================

export const PessoaValidationSchema = new Validator<Pessoa>([
  {
    field: 'nome',
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 100,
    message: 'Nome deve ter entre 2 e 100 caracteres'
  },
  {
    field: 'cpf',
    required: true,
    type: 'cpf',
    message: 'CPF inválido'
  },
  {
    field: 'telefone',
    required: false,
    type: 'string',
    custom: (value) => !value || ValidationUtils.validateTelefone(value),
    message: 'Telefone inválido'
  },
  {
    field: 'email',
    required: false,
    type: 'email',
    message: 'Email inválido'
  }
]);

export const VeiculoValidationSchema = new Validator<Veiculo>([
  {
    field: 'placa',
    required: true,
    type: 'placa',
    message: 'Placa inválida (use formato ABC1234 ou ABC1D23)'
  },
  {
    field: 'proprietarioId',
    required: true,
    type: 'string',
    minLength: 1,
    message: 'ID do proprietário é obrigatório'
  },
  {
    field: 'modelo',
    required: false,
    type: 'string',
    maxLength: 50,
    message: 'Modelo deve ter no máximo 50 caracteres'
  },
  {
    field: 'marca',
    required: false,
    type: 'string',
    maxLength: 30,
    message: 'Marca deve ter no máximo 30 caracteres'
  },
  {
    field: 'cor',
    required: false,
    type: 'string',
    maxLength: 20,
    message: 'Cor deve ter no máximo 20 caracteres'
  },
  {
    field: 'ano',
    required: false,
    type: 'string',
    pattern: /^\d{4}$/,
    message: 'Ano deve ter 4 dígitos'
  }
]);

export const ConsultaValidationSchema = new Validator<ConsultaResult>([
  {
    field: 'placa',
    required: true,
    type: 'placa',
    message: 'Placa inválida'
  },
  {
    field: 'success',
    required: true,
    type: 'boolean',
    message: 'Campo success deve ser boolean'
  },
  {
    field: 'executionTime',
    required: true,
    type: 'number',
    min: 0,
    message: 'Tempo de execução deve ser um número positivo'
  },
  {
    field: 'sessionId',
    required: true,
    type: 'string',
    minLength: 1,
    message: 'ID da sessão é obrigatório'
  }
]);

export const SessaoValidationSchema = new Validator<SessaoConsulta>([
  {
    field: 'nome',
    required: true,
    type: 'string',
    minLength: 3,
    maxLength: 100,
    message: 'Nome da sessão deve ter entre 3 e 100 caracteres'
  },
  {
    field: 'startTime',
    required: true,
    type: 'string',
    message: 'Data de início é obrigatória'
  },
  {
    field: 'status',
    required: true,
    type: 'string',
    custom: (value) => ['ativa', 'concluida', 'pausada', 'cancelada'].includes(value),
    message: 'Status deve ser: ativa, concluida, pausada ou cancelada'
  },
  {
    field: 'totalPlacas',
    required: true,
    type: 'number',
    min: 0,
    message: 'Total de placas deve ser um número positivo'
  }
]);

// ============================================================================
// FUNÇÕES UTILITÁRIAS DE VALIDAÇÃO
// ============================================================================

export function validatePessoa(data: Partial<Pessoa>): ValidationResult {
  return PessoaValidationSchema.validate(data);
}

export function validateVeiculo(data: Partial<Veiculo>): ValidationResult {
  return VeiculoValidationSchema.validate(data);
}

export function validateConsulta(data: Partial<ConsultaResult>): ValidationResult {
  return ConsultaValidationSchema.validate(data);
}

export function validateSessao(data: Partial<SessaoConsulta>): ValidationResult {
  return SessaoValidationSchema.validate(data);
}

export function validatePlacas(placas: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const placa of placas) {
    if (ValidationUtils.validatePlaca(placa).valid) {
      valid.push(ValidationUtils.formatPlaca(placa));
    } else {
      invalid.push(placa);
    }
  }

  return { valid, invalid };
}

export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove caracteres perigosos
    .substring(0, 1000); // Limita tamanho
}

export function validateConfig(data: Partial<ConfiguracaoSistema>): ValidationResult {
  const validator = new Validator<ConfiguracaoSistema>([
    {
      field: 'chave',
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 50,
      message: 'Chave da configuração deve ter entre 1 e 50 caracteres'
    },
    {
      field: 'tipo',
      required: true,
      type: 'string',
      custom: (value) => ['string', 'number', 'boolean', 'object', 'array'].includes(value),
      message: 'Tipo deve ser: string, number, boolean, object ou array'
    },
    {
      field: 'categoria',
      required: true,
      type: 'string',
      custom: (value) => ['geral', 'extensao', 'bot', 'database', 'api'].includes(value),
      message: 'Categoria deve ser: geral, extensao, bot, database ou api'
    }
  ]);

  return validator.validate(data);
}

// Export default
export default ValidationUtils;
