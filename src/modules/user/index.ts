/**
 * User Module - Public API
 *
 * @description
 * This module provides user management, authentication, and synchronization
 * capabilities for the OpenChat platform.
 *
 * @example
 * ```typescript
 * import { UserModule } from './user';
 *
 * @Module({
 *   imports: [UserModule],
 * })
 * export class AppModule {}
 * ```
 */

// Module
export { UserModule } from './user.module';

// Entities
export { UserEntity } from './entities/user.entity';

// Services
export { UserService } from './services/user.service';

// Controllers
export { UserController } from './controllers/user.controller';

// DTOs
export {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from './dto/auth.dto';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';

// Decorators
export { CurrentUser } from './decorators/current-user.decorator';
