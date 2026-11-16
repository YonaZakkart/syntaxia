import type { JwtPayload } from './lib/jwt';

export type AppEnv = {
  Variables: {
    user: JwtPayload;
  };
};
