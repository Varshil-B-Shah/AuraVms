'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { FileText, CheckCircle, Mail, Zap } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: FileText,
      title: 'Easy Upload',
      description: 'Simply upload your documents in .txt, .md, or .docx format with a single click.'
    },
    {
      icon: Zap,
      title: 'Instant Parsing',
      description: 'Our system automatically extracts and formats your content beautifully.'
    },
    {
      icon: Mail,
      title: 'Email Notifications',
      description: 'Get notified instantly when your submissions are reviewed and approved.'
    },
    {
      icon: CheckCircle,
      title: 'Smart Workflow',
      description: 'Seamless approval process from submission to publication in seconds.'
    }
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-secondary/20 to-background">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden"
      >
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center space-x-2"
            >
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">DocFlow</span>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90">
                  Login
                </Button>
              </Link>
            </motion.div>
          </nav>
        </header>

        {/* Hero Content */}
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 tracking-tight">
                Document Approval
                <span className="text-primary block mt-2">Made Simple</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Streamline your content workflow with our intelligent document approval system. 
                Upload, review, and approve in minutes.
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/writer/login">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 group">
                  Get Started
                  <motion.span
                    className="ml-2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.span>
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2">
                  Learn More
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
      </motion.div>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A complete solution for managing document approvals efficiently
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
            >
              <Card className="p-6 h-full bg-card hover:shadow-lg transition-all duration-300 border-border/50">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-linear-to-br from-primary/10 via-accent/5 to-primary/5 border-primary/20 p-12 text-center">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Ready to get started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join hundreds of teams already using DocFlow to streamline their approval process
            </p>
            <Link href="/writer/login">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6">
                Start Free Today
              </Button>
            </Link>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-border/50">
        <div className="text-center text-muted-foreground">
          <p>© 2026 DocFlow. Built for efficient document approval workflows.</p>
        </div>
      </footer>
    </div>
  );
}
