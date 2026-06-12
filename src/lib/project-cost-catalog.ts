export type CostCategory =
  | "compute"
  | "database"
  | "load_balancer"
  | "storage"
  | "cdn_dns"
  | "repository"
  | "other";

export type CostProvider = "AWS" | "Cloudflare" | "GitHub" | "GitLab";

export type CostPreset = {
  id: string;
  category: CostCategory;
  categoryLabel: string;
  provider: CostProvider;
  label: string;
  /** Estimasi harga per unit per bulan (USD). */
  monthlyUsd: number;
  unit: "instance" | "month" | "user" | "gb" | "domain";
  description?: string;
};

/** Estimasi on-demand bulanan (USD). Harga AWS dapat berbeda per region. */
export const COST_PRESETS: CostPreset[] = [
  // AWS EC2
  { id: "aws-ec2-t3-micro", category: "compute", categoryLabel: "Compute (EC2)", provider: "AWS", label: "EC2 t3.micro", monthlyUsd: 7.5, unit: "instance", description: "~2 vCPU burst, 1 GiB RAM" },
  { id: "aws-ec2-t3-small", category: "compute", categoryLabel: "Compute (EC2)", provider: "AWS", label: "EC2 t3.small", monthlyUsd: 15, unit: "instance", description: "2 vCPU burst, 2 GiB RAM" },
  { id: "aws-ec2-t3-medium", category: "compute", categoryLabel: "Compute (EC2)", provider: "AWS", label: "EC2 t3.medium", monthlyUsd: 30, unit: "instance", description: "2 vCPU burst, 4 GiB RAM" },
  { id: "aws-ec2-t3-large", category: "compute", categoryLabel: "Compute (EC2)", provider: "AWS", label: "EC2 t3.large", monthlyUsd: 60, unit: "instance", description: "2 vCPU burst, 8 GiB RAM" },
  { id: "aws-ec2-t3-xlarge", category: "compute", categoryLabel: "Compute (EC2)", provider: "AWS", label: "EC2 t3.xlarge", monthlyUsd: 120, unit: "instance", description: "4 vCPU burst, 16 GiB RAM" },
  { id: "aws-ec2-m5-large", category: "compute", categoryLabel: "Compute (EC2)", provider: "AWS", label: "EC2 m5.large", monthlyUsd: 70, unit: "instance", description: "2 vCPU, 8 GiB RAM" },
  { id: "aws-ec2-c5-large", category: "compute", categoryLabel: "Compute (EC2)", provider: "AWS", label: "EC2 c5.large", monthlyUsd: 62, unit: "instance", description: "2 vCPU compute-optimized" },

  // AWS RDS
  { id: "aws-rds-t3-micro", category: "database", categoryLabel: "Database (RDS)", provider: "AWS", label: "RDS db.t3.micro", monthlyUsd: 12, unit: "instance", description: "PostgreSQL/MySQL single-AZ" },
  { id: "aws-rds-t3-small", category: "database", categoryLabel: "Database (RDS)", provider: "AWS", label: "RDS db.t3.small", monthlyUsd: 24, unit: "instance" },
  { id: "aws-rds-t3-medium", category: "database", categoryLabel: "Database (RDS)", provider: "AWS", label: "RDS db.t3.medium", monthlyUsd: 48, unit: "instance" },
  { id: "aws-rds-t3-large", category: "database", categoryLabel: "Database (RDS)", provider: "AWS", label: "RDS db.t3.large", monthlyUsd: 96, unit: "instance" },
  { id: "aws-rds-m5-large", category: "database", categoryLabel: "Database (RDS)", provider: "AWS", label: "RDS db.m5.large", monthlyUsd: 125, unit: "instance" },
  { id: "aws-aurora-serverless-v2", category: "database", categoryLabel: "Database (RDS)", provider: "AWS", label: "Aurora Serverless v2 (min)", monthlyUsd: 45, unit: "month", description: "Estimasi kapasitas minimum" },

  // AWS Load Balancer & storage
  { id: "aws-alb", category: "load_balancer", categoryLabel: "Load Balancer", provider: "AWS", label: "Application Load Balancer (ALB)", monthlyUsd: 22, unit: "month", description: "Base + sedikit LCU" },
  { id: "aws-nlb", category: "load_balancer", categoryLabel: "Load Balancer", provider: "AWS", label: "Network Load Balancer (NLB)", monthlyUsd: 18, unit: "month" },
  { id: "aws-ebs-100gp3", category: "storage", categoryLabel: "Storage (EBS)", provider: "AWS", label: "EBS 100 GB gp3", monthlyUsd: 8, unit: "gb", description: "Per 100 GB" },
  { id: "aws-ebs-500gp3", category: "storage", categoryLabel: "Storage (EBS)", provider: "AWS", label: "EBS 500 GB gp3", monthlyUsd: 40, unit: "gb" },
  { id: "aws-route53-hosted", category: "cdn_dns", categoryLabel: "DNS", provider: "AWS", label: "Route 53 hosted zone", monthlyUsd: 0.5, unit: "domain" },

  // Cloudflare
  { id: "cf-free", category: "cdn_dns", categoryLabel: "CDN / DNS", provider: "Cloudflare", label: "Cloudflare Free", monthlyUsd: 0, unit: "domain" },
  { id: "cf-pro", category: "cdn_dns", categoryLabel: "CDN / DNS", provider: "Cloudflare", label: "Cloudflare Pro", monthlyUsd: 20, unit: "domain" },
  { id: "cf-business", category: "cdn_dns", categoryLabel: "CDN / DNS", provider: "Cloudflare", label: "Cloudflare Business", monthlyUsd: 200, unit: "domain" },
  { id: "cf-workers-paid", category: "cdn_dns", categoryLabel: "CDN / DNS", provider: "Cloudflare", label: "Workers Paid (base)", monthlyUsd: 5, unit: "month" },

  // GitHub
  { id: "gh-free", category: "repository", categoryLabel: "Repository", provider: "GitHub", label: "GitHub Free", monthlyUsd: 0, unit: "month" },
  { id: "gh-team", category: "repository", categoryLabel: "Repository", provider: "GitHub", label: "GitHub Team", monthlyUsd: 4, unit: "user", description: "Per user / bulan" },
  { id: "gh-enterprise", category: "repository", categoryLabel: "Repository", provider: "GitHub", label: "GitHub Enterprise", monthlyUsd: 21, unit: "user" },
  { id: "gh-actions-minutes", category: "repository", categoryLabel: "Repository", provider: "GitHub", label: "Actions extra (est. 50k min)", monthlyUsd: 40, unit: "month" },

  // GitLab
  { id: "gl-free", category: "repository", categoryLabel: "Repository", provider: "GitLab", label: "GitLab Free", monthlyUsd: 0, unit: "month" },
  { id: "gl-premium", category: "repository", categoryLabel: "Repository", provider: "GitLab", label: "GitLab Premium", monthlyUsd: 29, unit: "user" },
  { id: "gl-ultimate", category: "repository", categoryLabel: "Repository", provider: "GitLab", label: "GitLab Ultimate", monthlyUsd: 47, unit: "user" },
  { id: "gl-runner", category: "repository", categoryLabel: "Repository", provider: "GitLab", label: "GitLab CI runner (shared est.)", monthlyUsd: 15, unit: "month" },
];

export const COST_CATEGORIES: { id: CostCategory; label: string }[] = [
  { id: "compute", label: "Compute (EC2)" },
  { id: "database", label: "Database (RDS)" },
  { id: "load_balancer", label: "Load Balancer" },
  { id: "storage", label: "Storage (EBS)" },
  { id: "cdn_dns", label: "CDN / DNS (Cloudflare)" },
  { id: "repository", label: "Repository (GitHub/GitLab)" },
  { id: "other", label: "Lainnya" },
];

export function getPresetById(id: string): CostPreset | undefined {
  return COST_PRESETS.find((p) => p.id === id);
}

export function presetsForCategory(category: CostCategory): CostPreset[] {
  return COST_PRESETS.filter((p) => p.category === category);
}
