import { useState } from "react";
import { Link } from "react-router-dom";
import { Satellite, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";

const LandingNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setIsMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-primary rounded outline-none">
            <Satellite className="h-5 w-5 text-primary transition-transform group-hover:rotate-12" />
            <span className="text-base font-bold tracking-widest uppercase text-foreground">
              Outsights
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-5 ml-4">
            <button
              onClick={() => scrollTo("solutions")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded px-1 outline-none"
            >
              Solutions
            </button>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <UserMenu isDark={false} />
          <Button
            onClick={() => scrollTo("cta")}
            size="sm"
            className="bg-primary text-primary-foreground font-semibold tracking-wide transition-all duration-300 shadow-sm focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            Join Waitlist
          </Button>
        </div>
        <div className="flex md:hidden items-center gap-3">
          <UserMenu isDark={false} />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-foreground p-1 focus-visible:ring-2 focus-visible:ring-primary rounded outline-none"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-4 flex flex-col gap-4">
            <button
              onClick={() => scrollTo("solutions")}
              className="text-left text-sm font-medium text-foreground py-2 border-b border-border/50 outline-none"
            >
              Solutions
            </button>
            <Button
              onClick={() => scrollTo("cta")}
              className="w-full bg-primary text-primary-foreground font-semibold outline-none"
            >
              Join Waitlist
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;
