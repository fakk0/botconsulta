// Service para consultas - será implementado
import { Logger } from '../utils/logger';

export class ConsultaService {
  private logger = new Logger('CONSULTA_SERVICE');
  
  constructor() {
    this.logger.info('ConsultaService inicializado');
  }
}