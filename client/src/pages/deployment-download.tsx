import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Package, Database, Server, Code, Layers, Shield, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeploymentInfo {
  version: string;
  name: string;
  description: string;
  lastGenerated: string;
}

export default function DeploymentDownload() {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: deploymentInfo, isLoading } = useQuery<DeploymentInfo>({
    queryKey: ["/api/deployment/info"],
  });

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/deployment/package");
      
      if (!response.ok) {
        throw new Error("Failed to download deployment package");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `corporate-management-system-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: "Your deployment package is downloading...",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download deployment package",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const techStack = [
    {
      category: "Frontend",
      icon: Code,
      technologies: [
        { name: "React 18.3", description: "Modern UI library" },
        { name: "TypeScript 5.3", description: "Type-safe JavaScript" },
        { name: "Vite 5.4", description: "Fast build tool" },
        { name: "TanStack Query 5.59", description: "Data synchronization" },
        { name: "shadcn/ui", description: "Component library" },
        { name: "Tailwind CSS 3.4", description: "Utility-first CSS" },
      ],
    },
    {
      category: "Backend",
      icon: Server,
      technologies: [
        { name: "Node.js 20+", description: "JavaScript runtime" },
        { name: "Express 4.21", description: "Web framework" },
        { name: "TypeScript", description: "Type-safe server code" },
        { name: "Passport.js 0.7", description: "Authentication" },
      ],
    },
    {
      category: "Database",
      icon: Database,
      technologies: [
        { name: "PostgreSQL 14+", description: "Relational database" },
        { name: "Drizzle ORM 0.36", description: "TypeScript ORM" },
        { name: "Neon Serverless", description: "Serverless driver" },
        { name: "bcrypt 5.1", description: "Password hashing" },
      ],
    },
    {
      category: "Features",
      icon: Layers,
      technologies: [
        { name: "Multi-Company Management", description: "UK company tracking" },
        { name: "Employee Onboarding", description: "Custom form builder" },
        { name: "Compliance Automation", description: "Task generation" },
        { name: "Sponsorship License", description: "COS & Level 1 tracking" },
        { name: "Attendance Reports", description: "Employee tracking" },
        { name: "Audit Logging", description: "Complete activity trail" },
      ],
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Deployment Package</h1>
              <p className="text-muted-foreground">
                Download complete source code and documentation for deployment
              </p>
            </div>
          </div>
        </div>

        {/* Download Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Deployment Package
            </CardTitle>
            <CardDescription>
              Complete source code, database schema, and deployment documentation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">Package Name</div>
                <div className="text-sm text-muted-foreground">
                  {isLoading ? "Loading..." : deploymentInfo?.name || "corporate-management-system"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Version</div>
                <div className="text-sm text-muted-foreground">
                  {isLoading ? "Loading..." : deploymentInfo?.version || "1.0.0"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Package Contents</div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Complete source code (client & server)
                </li>
                <li className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Database schema (Drizzle ORM)
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Deployment guide & documentation
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Environment variable template (.env.example)
                </li>
                <li className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Package.json with all dependencies
                </li>
              </ul>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <Button
                size="lg"
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full sm:w-auto"
                data-testid="button-download-package"
              >
                {isDownloading ? (
                  <>Preparing Download...</>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Download Package
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Package size: Approximately 5-10 MB (excludes node_modules)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Technology Stack */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Technology Stack</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {techStack.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5" />
                      {section.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {section.technologies.map((tech) => (
                        <li key={tech.name} className="space-y-1">
                          <div className="text-sm font-medium">{tech.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {tech.description}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* System Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>System Requirements</CardTitle>
            <CardDescription>
              Prerequisites for deploying this application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Software</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Node.js 20.x or higher</li>
                    <li>• npm 10.x or higher</li>
                    <li>• PostgreSQL 14+ database</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Required Services</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• PostgreSQL database (Neon or self-hosted)</li>
                    <li>• Companies House API key (optional)</li>
                    <li>• Domain name (for production)</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>
              Basic steps to deploy the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                  1
                </span>
                <div>
                  <div className="font-medium">Extract the package</div>
                  <div className="text-muted-foreground">
                    Unzip the downloaded file to your deployment location
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                  2
                </span>
                <div>
                  <div className="font-medium">Install dependencies</div>
                  <div className="text-muted-foreground">
                    Run <code className="bg-muted px-1 rounded">npm install</code>
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                  3
                </span>
                <div>
                  <div className="font-medium">Configure environment</div>
                  <div className="text-muted-foreground">
                    Copy .env.example to .env and fill in your database URL and session secret
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                  4
                </span>
                <div>
                  <div className="font-medium">Setup database</div>
                  <div className="text-muted-foreground">
                    Run <code className="bg-muted px-1 rounded">npm run db:push</code> to create tables
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                  5
                </span>
                <div>
                  <div className="font-medium">Start the application</div>
                  <div className="text-muted-foreground">
                    Run <code className="bg-muted px-1 rounded">npm run dev</code> for development or <code className="bg-muted px-1 rounded">npm start</code> for production
                  </div>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Documentation Link */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Complete Documentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              The deployment package includes a comprehensive DEPLOYMENT_GUIDE.md file with:
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
              <li>• Detailed installation instructions</li>
              <li>• Database setup and migration guide</li>
              <li>• Production deployment (VPS/Cloud)</li>
              <li>• Environment configuration</li>
              <li>• Security best practices</li>
              <li>• Troubleshooting guide</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
