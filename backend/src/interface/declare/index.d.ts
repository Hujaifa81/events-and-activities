import { JwtPayload } from "jsonwebtoken";

export interface IJwtPayload extends JwtPayload {
  email: string;
  role: "USER" | "ADMIN";
}


declare global {
  namespace Express {
    interface Request {
      user: IJwtPayload;
    }
  }
}

export {};
