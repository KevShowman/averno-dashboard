import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'LaSanta Calavera API is running! 💀';
  }
}
