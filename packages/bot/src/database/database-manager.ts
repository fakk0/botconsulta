// Gerenciador de banco de dados - será implementado
import { Logger } from '../utils/logger';

export class DatabaseManager {
  private logger = new Logger('DATABASE');
  
  constructor() {
    this.logger.info('DatabaseManager inicializado');
  }
}