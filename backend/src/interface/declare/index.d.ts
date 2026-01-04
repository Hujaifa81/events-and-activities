import { JwtPayload } from "jsonwebtoken";
import { UserRole } from "../../app/modules/user/user.interface";

export interface IJwtPayload extends JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}


declare global {
  namespace Express {
    interface Request {
      user: IJwtPayload;
      sessionId?: string;
    }
  }
}

export {};
