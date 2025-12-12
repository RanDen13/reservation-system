"use client";

import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Shield, Users, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5 },
};

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Hero Section */}
      <section className="relative w-full min-h-[calc(100vh-3rem)] py-20 overflow-hidden flex items-center justify-center">
        {/* University Building Background - Only in Hero */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/lcupBg.png"
            alt="La Consolacion University Philippines"
            fill
            className="object-cover"
            priority
            quality={100}
          />
        </div>

        {/* Dark overlay for hero section */}
        <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/70 to-slate-800/60 z-5" />

        {/* Animated gradient orbs */}
        <motion.div
          className="absolute -right-40 -top-40 w-96 h-96 rounded-full bg-blue-500/30 blur-3xl z-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        />
        <motion.div
          className="absolute -left-40 bottom-0 w-md h-112 rounded-full bg-indigo-500/25 blur-3xl z-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.1 }}
        />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 lg:px-20">
          <motion.div
            className="flex flex-col-reverse lg:flex-row items-center gap-10 lg:gap-16"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            {/* Left Content */}
            <motion.div
              className="w-full lg:w-1/2 text-center lg:text-left flex flex-col items-center lg:items-start"
              variants={fadeInUp}
            >
              <motion.p
                variants={fadeInUp}
                className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-6 py-2 text-xs font-medium tracking-[0.2em] uppercase backdrop-blur-sm text-white"
              >
                LCUP · Event Management
              </motion.p>

              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6"
              >
                <span className="block bg-linear-to-r from-sky-300 to-emerald-300 bg-clip-text text-transparent drop-shadow-lg">
                  Book Your
                </span>
                <span className="block bg-linear-to-r from-sky-300 to-emerald-300 bg-clip-text text-transparent drop-shadow-lg">
                  Event Space
                </span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg md:text-xl text-white/80 font-light max-w-xl mb-8"
              >
                Reserve campus venues with real-time availability. Perfect for
                LCUP students, faculty, and administrators—manage bookings
                seamlessly on-campus or remotely.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
              >
                <Link href="/signup" className="w-full sm:w-auto">
                  <motion.div
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 0 25px rgba(56, 189, 248, 0.5)",
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full"
                  >
                    <Button
                      size="lg"
                      className="w-full sm:w-auto text-lg px-10 py-6 bg-linear-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 border-0 shadow-xl"
                    >
                      Get Started
                      <Zap className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full"
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto text-lg px-10 py-6 border-white/30 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm"
                    >
                      Sign In
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>

              <motion.p
                variants={fadeInUp}
                className="mt-6 text-xs sm:text-sm text-white/60"
              >
                Available for all LCUP students, faculty, and staff members.
              </motion.p>
            </motion.div>

            {/* Right Content - Visual Element */}
            <motion.div
              className="w-full lg:w-1/2 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.9, x: 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="relative w-full max-w-md lg:max-w-lg">
                {/* Glowing background */}
                <div className="absolute -inset-8 rounded-3xl bg-linear-to-br from-sky-400/40 to-emerald-400/40 blur-3xl" />

                {/* Glass card effect */}
                <div className="relative rounded-3xl bg-white/5 border border-white/15 backdrop-blur-xl p-8 lg:p-12 shadow-2xl">
                  {/* Calendar/Booking Icon Representation */}
                  <motion.div
                    className="space-y-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-linear-to-br from-sky-400 to-emerald-400 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">
                            Quick Booking
                          </p>
                          <p className="text-white/60 text-xs">
                            Select your venue
                          </p>
                        </div>
                      </div>
                      <motion.div
                        className="w-2 h-2 rounded-full bg-emerald-400"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>

                    {/* Mock booking cards */}
                    {[1, 2, 3].map((item, index) => (
                      <motion.div
                        key={item}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 5 }}
                      >
                        <div className="w-12 h-12 rounded-lg bg-linear-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                          <MapPin className="w-5 h-5 text-sky-300" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">
                            Venue {item}
                          </p>
                          <p className="text-white/50 text-xs">
                            Capacity: {50 + item * 20}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-emerald-400 text-xs font-medium">
                            Available
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section - Updated styling */}
      <section className="relative z-10 container mx-auto px-4 -mt-10 mb-20">
        <motion.div
          className="rounded-2xl bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl p-8"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-sm text-gray-500 mb-6 text-center">
            Trusted by the LCUP community
          </p>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div
              className="flex flex-col items-center gap-2 group cursor-pointer"
              variants={scaleIn}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <div className="w-14 h-14 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-2 shadow-lg group-hover:shadow-blue-500/50 transition-all">
                <Users className="h-7 w-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-900">1000+</span>
              <span className="text-sm text-gray-600">Active Users</span>
            </motion.div>
            <motion.div
              className="flex flex-col items-center gap-2 group cursor-pointer"
              variants={scaleIn}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <div className="w-14 h-14 rounded-full bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-2 shadow-lg group-hover:shadow-emerald-500/50 transition-all">
                <MapPin className="h-7 w-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-900">50+</span>
              <span className="text-sm text-gray-600">Event Spaces</span>
            </motion.div>
            <motion.div
              className="flex flex-col items-center gap-2 group cursor-pointer"
              variants={scaleIn}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <div className="w-14 h-14 rounded-full bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-2 shadow-lg group-hover:shadow-purple-500/50 transition-all">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-gray-900">5000+</span>
              <span className="text-sm text-gray-600">Bookings Made</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-linear-to-b from-white to-blue-50 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why Choose Our System?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to manage event space reservations efficiently
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {/* Feature 1 */}
          <motion.div variants={fadeInUp}>
            <Card className="border-2 hover:shadow-xl transition-all h-full group cursor-pointer">
              <CardHeader>
                <motion.div
                  className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Zap className="h-6 w-6 text-blue-600" />
                </motion.div>
                <CardTitle className="text-2xl group-hover:text-blue-600 transition-colors">
                  Real-Time Availability
                </CardTitle>
                <CardDescription className="text-base">
                  Check space availability instantly and avoid double bookings
                  with our live system
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Feature 2 */}
          <motion.div variants={fadeInUp}>
            <Card className="border-2 hover:shadow-xl transition-all h-full group cursor-pointer">
              <CardHeader>
                <motion.div
                  className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Calendar className="h-6 w-6 text-green-600" />
                </motion.div>
                <CardTitle className="text-2xl group-hover:text-green-600 transition-colors">
                  Easy Scheduling
                </CardTitle>
                <CardDescription className="text-base">
                  Interactive calendar view makes booking your preferred time
                  slot simple and intuitive
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Feature 3 */}
          <motion.div variants={fadeInUp}>
            <Card className="border-2 hover:shadow-xl transition-all h-full group cursor-pointer">
              <CardHeader>
                <motion.div
                  className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Shield className="h-6 w-6 text-purple-600" />
                </motion.div>
                <CardTitle className="text-2xl group-hover:text-purple-600 transition-colors">
                  Admin Control
                </CardTitle>
                <CardDescription className="text-base">
                  Powerful admin dashboard to approve, manage, and monitor all
                  reservations
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Feature 4 */}
          <motion.div variants={fadeInUp}>
            <Card className="border-2 hover:shadow-xl transition-all h-full group cursor-pointer">
              <CardHeader>
                <motion.div
                  className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Clock className="h-6 w-6 text-orange-600" />
                </motion.div>
                <CardTitle className="text-2xl group-hover:text-orange-600 transition-colors">
                  Instant Notifications
                </CardTitle>
                <CardDescription className="text-base">
                  Get immediate confirmation and updates about your bookings via
                  email
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Feature 5 */}
          <motion.div variants={fadeInUp}>
            <Card className="border-2 hover:shadow-xl transition-all h-full group cursor-pointer">
              <CardHeader>
                <motion.div
                  className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <MapPin className="h-6 w-6 text-red-600" />
                </motion.div>
                <CardTitle className="text-2xl group-hover:text-red-600 transition-colors">
                  Multiple Venues
                </CardTitle>
                <CardDescription className="text-base">
                  Browse and book from a variety of event spaces with photos and
                  capacity info
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Feature 6 */}
          <motion.div variants={fadeInUp}>
            <Card className="border-2 hover:shadow-xl transition-all h-full group cursor-pointer">
              <CardHeader>
                <motion.div
                  className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Users className="h-6 w-6 text-indigo-600" />
                </motion.div>
                <CardTitle className="text-2xl group-hover:text-indigo-600 transition-colors">
                  Kiosk Mode
                </CardTitle>
                <CardDescription className="text-base">
                  Touch-friendly interface perfect for on-campus kiosks and
                  quick bookings
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-linear-to-r from-blue-600 to-blue-700 border-0 text-white overflow-hidden relative">
            <motion.div
              className="absolute inset-0 opacity-30"
              animate={{
                background: [
                  "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
                  "radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
                  "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
                ],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
            <CardContent className="py-16 text-center relative z-10">
              <motion.h2
                className="text-4xl md:text-5xl font-bold mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Ready to Get Started?
              </motion.h2>
              <motion.p
                className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                Join the LCUP community in using our platform to book campus
                event spaces effortlessly
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <Link href="/signup">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      variant="secondary"
                      className="text-lg px-8 py-6"
                    >
                      Create Account
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/login">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-lg px-8 py-6 bg-transparent text-white border-white hover:bg-white hover:text-blue-600"
                    >
                      Sign In
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <motion.footer
        className="bg-gray-900 text-gray-400 py-12"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            © 2025 La Consolacion University Philippines. All rights reserved.
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
