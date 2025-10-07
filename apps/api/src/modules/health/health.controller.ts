import { Controller, Get } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller({
  path: 'health',
  version: '1',
})
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    const db = await this.healthService.checkDatabase();
    const uptime = this.healthService.checkUptime();

    return {
      status: 'ok',
      ...uptime,
      database: db,
    };
  }
}
