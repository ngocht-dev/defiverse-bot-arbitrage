import pairArbitrageService from './pairArbitrage.service';
import triangleArbitrageService from './triangleArbitrage.service';

const arbitrageService = {
  start: async () => {
    await Promise.all([
      pairArbitrageService.start(),
      triangleArbitrageService.start(),
    ]);
  },
  end: async () => {
    await Promise.all([
      pairArbitrageService.end(),
      triangleArbitrageService.end(),
    ]);
  },
  getState: () => {
    return (
      pairArbitrageService.getState() && triangleArbitrageService.getState()
    );
  },
};

export default arbitrageService;
