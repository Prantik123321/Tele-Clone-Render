import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export default function AuthPage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left side - Hero */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        {/* Abstract shapes */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-3xl animate-pulse"></div>
        <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>

        <div className="relative z-10 max-w-xl px-12 text-center text-white">
          <div className="mb-8 flex justify-center">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/20">
              <MessageCircle className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            Connect freely.
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Experience real-time messaging with a modern, elegant interface. 
            Secure, fast, and built for seamless communication.
          </p>
        </div>
      </div>

      {/* Right side - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="max-w-sm w-full space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="mt-2 text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <div className="space-y-4 pt-4">
            <Button 
              onClick={handleLogin}
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
            >
              Sign in with Replit
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Secure Authentication
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              By clicking continue, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
