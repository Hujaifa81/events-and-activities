import { IJwtPayload } from "@/interface";
import jwt, { Secret, SignOptions } from "jsonwebtoken";

export const generateToken = (
  payload: IJwtPayload,
  secret: Secret,
  expiresIn: string
) => {
  const token = jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn,
  } as SignOptions);

  return token;
};

export const verifyToken = (token: string, secret: Secret) => {
  return jwt.verify(token, secret) as IJwtPayload;
};
