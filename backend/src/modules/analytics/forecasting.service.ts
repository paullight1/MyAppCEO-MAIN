import { Injectable } from '@nestjs/common';
import { ForecastScenario } from '../../../../packages/types/src';

@Injectable()
export class ForecastingService {
  generate12MonthForecast(currentMrr: number): ForecastScenario[] {
    const scenarios: ForecastScenario[] = [];
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

    let consMrr = currentMrr;
    let baseMrr = currentMrr;
    let optMrr = currentMrr;

    for (const month of months) {
      consMrr *= 1.02; // 2% growth
      baseMrr *= 1.05; // 5% growth
      optMrr *= 1.10;  // 10% growth

      scenarios.push({
        month,
        conservative: Math.round(consMrr),
        base: Math.round(baseMrr),
        optimistic: Math.round(optMrr),
      });
    }

    return scenarios;
  }
}
