import { betterAuth } from "better-auth";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, magicLink } from "better-auth/plugins";
import { randomInt } from "node:crypto";
import { sendEmail } from "./email";
import { prisma } from "./prisma";

const appUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_URL ||
  "http://localhost:3000";
const magicCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const magicCodeLength = 10;
const magicCodeGroupSize = 5;
const magicCodeExpiryMinutes = 5;

const generateMagicCode = () =>
  Array.from(
    { length: magicCodeLength },
    () => magicCodeAlphabet[randomInt(0, magicCodeAlphabet.length)],
  ).join("");

const formatMagicCode = (token: string) =>
  token.match(new RegExp(`.{1,${magicCodeGroupSize}}`, "g"))?.join("-") ?? token;

export const auth = betterAuth({
  baseURL: appUrl,
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  plugins: [
    admin({
      defaultRole: "OFFICER",
      adminRoles: ["SUPER_ADMIN"],
      roles: {
        OFFICER: userAc,
        APPROVER: userAc,
        ADMIN: userAc,
        SUPER_ADMIN: adminAc,
      },
    }),
    magicLink({
      expiresIn: magicCodeExpiryMinutes * 60,
      disableSignUp: true,
      generateToken: async () => generateMagicCode(),
      sendMagicLink: async ({ email, token, url }) => {
        const formattedCode = formatMagicCode(token);
        const sent = await sendEmail(
          email,
          "Your Zerve magic code",
          [
            "Use this magic code to sign in to Zerve:",
            "",
            formattedCode,
            "",
            `This code expires in ${magicCodeExpiryMinutes} minutes.`,
            "You can also open this link on the same device:",
            url,
          ].join("\n"),
        );

        if (!sent) {
          throw new Error("Magic code email could not be sent.");
        }
      },
      rateLimit: {
        window: 60,
        max: 5,
      },
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
      },
    },
  },
});
