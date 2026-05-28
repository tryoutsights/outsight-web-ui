import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, BarChart3, MapPin, Layers, Tag, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import LandingNavbar from "@/components/LandingNavbar";

const solutions = [
  {
    icon: MapPin,
    title: "Identify Growth Corridors",
    description: "Spot urban sprawl and infrastructure development years before they hit mainstream reports.",
    image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=400&fit=crop",
  },
  {
    icon: Building2,
    title: "Track Development",
    description: "Monitor new construction and land clearing across vast regions with automated satellite analysis.",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Decisions",
    description: "Validate your intuition with hard data. Make high-stakes land investments with confidence.",
    image: "https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=600&h=400&fit=crop",
  },
];

const Landing = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    toast.success("Thank you! We'll be in touch soon.");
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary tracking-wider uppercase">
                <Satellite className="h-3.5 w-3.5" />
                Geospatial Intelligence for Investors
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-foreground">
                Analyze sites & track construction{" "}
                <span className="text-primary">from space.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Outsights delivers satellite imagery and geospatial intelligence to help real estate and construction teams make faster, data-driven decisions.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  asChild
                  className="bg-primary text-primary-foreground font-semibold tracking-wide transition-all duration-300 hover:scale-[1.02] shadow-sm"
                >
                  <Link to="/platform">Explore the Map</Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => document.getElementById("solutions")?.scrollIntoView({ behavior: "smooth" })}
                  className="border-border/50 hover:border-primary/50 hover:text-primary transition-all duration-300"
                >
                  View Solutions
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-border shadow-soft">
                <img
                  src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop"
                  alt="Aerial view of a construction site"
                  className="w-full h-auto object-cover"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
              <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 shadow-soft">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">Data Provenance</p>
                  <p className="text-xs text-muted-foreground">Powered by 10m Sentinel-2 data</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Solutions */}
      <section id="solutions" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Built for Real Estate Investors
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Purpose-built solutions to validate your intuition and uncover hidden opportunities.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {solutions.map((s) => (
              <div
                key={s.title}
                className="group relative rounded-xl border border-border/30 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={s.image}
                    alt={s.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="relative p-6 pt-8">
                  <div className="absolute -top-5 left-6 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center backdrop-blur-sm">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Demo */}
      <section className="py-20 md:py-28 bg-card/50 border-y border-border/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Extract the data that matters.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Our platform transforms raw satellite imagery into actionable geospatial insights.
            </p>
          </div>
          <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden border border-border shadow-soft">
            <img
              src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=600&fit=crop"
              alt="Satellite view of Earth"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
            {/* Floating analytics cards */}
            <div className="absolute top-6 left-6 bg-card border border-border rounded-lg px-4 py-3 shadow-soft max-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Building Footprint</span>
              </div>
              <p className="text-xs text-muted-foreground">12,847 structures detected</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[78%] rounded-full bg-primary" />
              </div>
            </div>
            <div className="absolute bottom-6 right-6 bg-card border border-border rounded-lg px-4 py-3 shadow-soft max-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <Tag className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Land Use Classification</span>
              </div>
              <div className="mt-1.5 space-y-1">
                {[
                  { label: "Residential", pct: "42%" },
                  { label: "Commercial", pct: "28%" },
                  { label: "Industrial", pct: "18%" },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="text-foreground font-medium">{r.pct}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute top-6 right-6 bg-card border border-border rounded-lg px-4 py-3 shadow-soft max-w-[180px]">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Change Detection</span>
              </div>
              <p className="text-xs text-muted-foreground">+14% development activity in Q4</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section id="cta" className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Find your next investment.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Join our waitlist and get early access to satellite-powered geospatial analytics for your next land acquisition.
          </p>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <Input
              type="email"
              placeholder="you@company.com"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-card border-border/50 shadow-inner focus:border-primary focus:ring-primary"
            />
            <Button
              type="submit"
              className="bg-primary text-primary-foreground font-semibold tracking-wide transition-all duration-300 shrink-0 shadow-sm"
            >
              Request Access
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Satellite className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold tracking-widest uppercase text-foreground">Outsights</span>
              <span className="text-xs text-muted-foreground ml-2">Geospatial Intelligence</span>
            </div>
            <a href="mailto:contact@outsights.io" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact Us
            </a>
          </div>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Outsights. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
