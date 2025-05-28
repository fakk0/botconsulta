// Controller da API REST
import { Router } from 'express';
import { Logger } from '../utils/logger';

export class ApiController {
  private router: Router;
  private logger = new Logger('API');
  
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }
  
  private setupRoutes(): void {
    this.router.get('/status', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });
    
    this.router.get('/consultas', (req, res) => {
      // Implementar listagem de consultas
      res.json({ message: 'Endpoint de consultas - será implementado' });
    });
  }
  
  getRouter(): Router {
    return this.router;
  }
}