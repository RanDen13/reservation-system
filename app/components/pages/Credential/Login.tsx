"use client";

import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { signIn } from "@/lib/auth-client";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePopup } from "../../Popup/PopupProvider";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const magicCodeLength = 10;
const magicCodeGroupSize = 5;

function normalizeMagicCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, magicCodeLength);
}

function formatMagicCode(value: string) {
  return (
    normalizeMagicCode(value)
      .match(new RegExp(`.{1,${magicCodeGroupSize}}`, "g"))
      ?.join("-") ?? ""
  );
}

function magicCodeErrorMessage(errorCode: string) {
  switch (errorCode) {
    case "INVALID_TOKEN":
      return "That magic code was not recognized. Check the code and try again.";
    case "EXPIRED_TOKEN":
      return "That magic code has expired. Request a new code and try again.";
    case "new_user_signup_disabled":
      return "This account must be created by the super admin first.";
    default:
      return "Magic code sign-in could not be completed. Please try again.";
  }
}

const Login = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingMagicCode, setSendingMagicCode] = useState(false);
  const [verifyingMagicCode, setVerifyingMagicCode] = useState(false);
  const [magicCode, setMagicCode] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const statusPopup = usePopup();
  const normalizedMagicCode = useMemo(() => normalizeMagicCode(magicCode), [magicCode]);
  const busy = loading || sendingMagicCode || verifyingMagicCode;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (!error) return;

    statusPopup.showError(magicCodeErrorMessage(error));
    window.history.replaceState({}, "", window.location.pathname);
  }, [statusPopup]);

  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    await signIn.email(
      {
        email: loginEmail,
        password: loginPassword,
        callbackURL: "/user/dashboard",
      },
      {
        onError: (ctx) => {
          statusPopup.showError(ctx.error.message || "Login failed");
        },
      },
    );

    setLoading(false);
  }

  async function handleSendMagicCode() {
    if (!loginEmail) {
      statusPopup.showError("Enter your email address first.");
      return;
    }

    setSendingMagicCode(true);
    await signIn.magicLink(
      {
        email: loginEmail,
        callbackURL: "/first-login",
        newUserCallbackURL: "/first-login",
        errorCallbackURL: "/login",
      },
      {
        onSuccess: () => {
          statusPopup.showSuccess("Magic code sent. Check your email.");
        },
        onError: (ctx) => {
          statusPopup.showError(ctx.error.message || "Unable to send magic code.");
        },
      },
    );
    setSendingMagicCode(false);
  }

  function handleMagicCodeLogin() {
    if (normalizedMagicCode.length !== magicCodeLength) {
      statusPopup.showError("Enter the full magic code from your email.");
      return;
    }

    setVerifyingMagicCode(true);
    const verifyUrl = new URL("/api/auth/magic-link/verify", window.location.origin);
    verifyUrl.searchParams.set("token", normalizedMagicCode);
    verifyUrl.searchParams.set("callbackURL", "/first-login");
    verifyUrl.searchParams.set("newUserCallbackURL", "/first-login");
    verifyUrl.searchParams.set("errorCallbackURL", "/login");
    window.location.assign(verifyUrl.toString());
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-r from-blue-50 via-white to-blue-50 px-4 py-10 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 -left-20 w-72 h-72 bg-blue-200 rounded-full opacity-20 blur-3xl"
          animate={{
            y: [0, 50, 0],
            x: [0, 30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 -right-20 w-96 h-96 bg-emerald-200 rounded-full opacity-20 blur-3xl"
          animate={{
            y: [0, -50, 0],
            x: [0, -30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Card className="border-2 shadow-2xl backdrop-blur-sm bg-white/95">
            <CardHeader className="text-center space-y-4 pb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-block mx-auto"
              >
                <div className="w-16 h-16 bg-linear-to-r from-sky-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              </motion.div>
              <div>
                <CardTitle className="text-3xl font-bold bg-linear-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Sign in to access your LCUP Venue Reservation account
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="login-email"
                    className="text-sm font-semibold"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      disabled={busy}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 h-12 text-base"
                      placeholder="admin@lcup.edu.ph"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="login-password"
                    className="text-sm font-semibold"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="login-password"
                      name="password"
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      disabled={busy}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 text-base"
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      disabled={busy}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full h-12 text-base bg-linear-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 shadow-lg cursor-pointer"
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="mr-2"
                      >
                        <Lock className="h-5 w-5" />
                      </motion.div>
                      Logging in...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-5 w-5" />
                      Log In
                    </>
                  )}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Magic Code
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={handleSendMagicCode}
                  className="h-12 w-full"
                >
                  <Send className="mr-2 h-5 w-5" />
                  {sendingMagicCode ? "Sending..." : "Email Me a Magic Code"}
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="magic-code" className="text-sm font-semibold">
                    Magic Code
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="magic-code"
                      value={magicCode}
                      onChange={(event) => setMagicCode(formatMagicCode(event.target.value))}
                      className="h-12 pl-10 text-base uppercase tracking-[0.2em]"
                      placeholder="ABCDE-FGHIJ"
                      disabled={busy}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={busy}
                  onClick={handleMagicCodeLogin}
                  className="h-12 w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <KeyRound className="mr-2 h-5 w-5" />
                  {verifyingMagicCode ? "Checking..." : "Sign In With Magic Code"}
                </Button>
              </div>

              <p className="mt-4 text-xs text-center text-gray-500">
                Accounts are created by the super admin. New accounts receive a magic code first.
              </p>
            </CardContent>
          </Card>

          {/* Back to Home Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center"
          >
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-sky-600 transition-colors inline-flex items-center gap-2 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
