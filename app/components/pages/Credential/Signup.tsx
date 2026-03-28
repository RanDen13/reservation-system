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
import { motion } from "framer-motion";
import { signUp } from "@/lib/auth-client";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { usePopup } from "../../Popup/PopupProvider";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Signup = () => {
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const statusPopup = usePopup();

  async function handleSignupSubmit(e: FormEvent) {
    e.preventDefault();

    if (signupPassword !== signupConfirmPassword) {
      statusPopup.showError("Passwords do not match.");
      return;
    }

    if (signupPassword.length < 8) {
      statusPopup.showError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    await signUp.email(
      {
        email: signupEmail,
        password: signupPassword,
        name: signupName,
        callbackURL: "/user/dashboard",
      },
      {
        onError: (ctx) => {
          statusPopup.showError(ctx.error.message || "Signup failed");
          setLoading(false);
        },
        onSuccess: () => {
          setLoading(false);
        },
      }
    );
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
                  <User className="w-8 h-8 text-white" />
                </div>
              </motion.div>
              <div>
                <CardTitle className="text-3xl font-bold bg-linear-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
                  Create Account
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Join LCUP Event System to manage reservations
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSignupSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="signup-name"
                    className="text-sm font-semibold"
                  >
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="pl-10 h-12 text-base"
                      placeholder="Juan Dela Cruz"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="signup-email"
                    className="text-sm font-semibold"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10 h-12 text-base"
                      placeholder="student@lcup.edu.ph"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="signup-password"
                    className="text-sm font-semibold"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 text-base"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      {showSignupPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirm-password"
                    className="text-sm font-semibold"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 text-base"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
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
                        <User className="h-5 w-5" />
                      </motion.div>
                      Creating account...
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-5 w-5" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-sky-600 hover:text-sky-700 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              <p className="mt-4 text-xs text-center text-gray-500">
                Available for LCUP students, faculty, and staff
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

export default Signup;
