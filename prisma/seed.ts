import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Tools
  const tools = await Promise.all([
    prisma.tool.upsert({ where: { id: "tool-docker" }, update: {}, create: { id: "tool-docker", name: "Docker", category: "Container", version: "25.0.3", description: "Container platform", docsUrl: "https://docs.docker.com" } }),
    prisma.tool.upsert({ where: { id: "tool-gh-actions" }, update: {}, create: { id: "tool-gh-actions", name: "GitHub Actions", category: "CI/CD", description: "CI/CD automation", docsUrl: "https://docs.github.com/actions" } }),
    prisma.tool.upsert({ where: { id: "tool-nginx" }, update: {}, create: { id: "tool-nginx", name: "Nginx", category: "Web Server", version: "1.25", docsUrl: "https://nginx.org/docs" } }),
    prisma.tool.upsert({ where: { id: "tool-postgres" }, update: {}, create: { id: "tool-postgres", name: "PostgreSQL", category: "Database", version: "16.2", docsUrl: "https://www.postgresql.org/docs" } }),
    prisma.tool.upsert({ where: { id: "tool-cloudflare" }, update: {}, create: { id: "tool-cloudflare", name: "Cloudflare", category: "CDN/DNS", docsUrl: "https://developers.cloudflare.com" } }),
    prisma.tool.upsert({ where: { id: "tool-prometheus" }, update: {}, create: { id: "tool-prometheus", name: "Prometheus", category: "Monitoring", version: "2.48", docsUrl: "https://prometheus.io/docs" } }),
    prisma.tool.upsert({ where: { id: "tool-grafana" }, update: {}, create: { id: "tool-grafana", name: "Grafana", category: "Monitoring", version: "10.3", docsUrl: "https://grafana.com/docs" } }),
    prisma.tool.upsert({ where: { id: "tool-redis" }, update: {}, create: { id: "tool-redis", name: "Redis", category: "Database", version: "7.2", docsUrl: "https://redis.io/docs" } }),
  ]);

  const project = await prisma.project.upsert({
    where: { slug: "portal-internal" },
    update: {},
    create: {
      slug: "portal-internal",
      name: "Portal Internal",
      description: "Internal employee portal & tools management platform",
      url: "https://portal.company.com",
      repoUrl: "https://github.com/company/portal",
      category: "Internal",
      management: "DevOps Team",
      status: "ACTIVE",
      platform: ["Next.js 14", "Node 20"],
      webBasedApp: "Yes",
      costPerMonth: "45",
      infras: {
        create: [
          {
            sortOrder: 0,
            envName: "production",
            targetGroup: "portal-tg-prod",
            loadBalancer: "ALB-portal-prod",
            serverIp: "10.0.1.45",
            hosting: ["AWS EC2 t3.medium"],
            cdn: ["Cloudflare"],
            databases: ["PostgreSQL 16", "Redis 7"],
          },
          {
            sortOrder: 1,
            envName: "staging",
            targetGroup: "portal-tg-stg",
            loadBalancer: "ALB-portal-stg",
            serverIp: "10.0.2.10",
            hosting: ["AWS EC2 t3.small"],
            cdn: [],
            databases: ["PostgreSQL 16"],
          },
        ],
      },
    },
  });

  for (const tool of [tools[0], tools[1], tools[2], tools[3], tools[4], tools[5], tools[6]]) {
    await prisma.projectTool.upsert({
      where: { projectId_toolId: { projectId: project.id, toolId: tool.id } },
      update: {},
      create: { projectId: project.id, toolId: tool.id },
    });
  }

  await prisma.doc.upsert({
    where: { id: "doc-cicd" },
    update: {},
    create: {
      id: "doc-cicd",
      title: "CI/CD Pipeline Guide — GitHub Actions",
      content: "# CI/CD Pipeline Guide\n\nPanduan lengkap setup CI/CD menggunakan GitHub Actions...",
      category: "CI/CD",
      tags: ["CI/CD", "Deploy", "GitHub Actions"],
      projectId: project.id,
    },
  });

  console.log("✅ Seeding complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
