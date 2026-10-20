import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Session, User } from "./models.js";

const tokenDigest = (token) => createHash("sha256").update(token).digest("hex");
const sessionTtlDays = Number.parseInt(process.env.SESSION_TTL_DAYS || "7", 10);

export async function issueSession(user) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000);
  await Session.create({ userId: user._id, tokenHash: tokenDigest(token), expiresAt });
  return { token, expiresAt };
}

export async function registerUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role: "user" });
  return user;
}

export async function loginUser(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return user;
}

export async function findSessionUser(token) {
  const session = await Session.findOne({ tokenHash: tokenDigest(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await User.findOne({ _id: session.userId, active: true });
  return user ? { user, session } : null;
}

export async function revokeSession(token) {
  await Session.deleteOne({ tokenHash: tokenDigest(token) });
}
