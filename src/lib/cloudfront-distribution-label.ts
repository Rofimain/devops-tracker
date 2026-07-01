import { CloudFrontClient, GetDistributionCommand } from "@aws-sdk/client-cloudfront";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const CLOUDFRONT_API_REGION = "us-east-1";
const AWS_TIMEOUT_MS = 8_000;

async function fetchLabelInner(
  distributionId: string,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<{ label: string | null; fetchError: string | null }> {
  const id = distributionId.trim();
  if (!id) return { label: null, fetchError: null };

  const client = new CloudFrontClient({
    region: CLOUDFRONT_API_REGION,
    credentials: { accessKeyId, secretAccessKey },
    requestHandler: new NodeHttpHandler({
      connectionTimeout: AWS_TIMEOUT_MS,
      requestTimeout: AWS_TIMEOUT_MS,
    }),
  });
  const out = await client.send(new GetDistributionCommand({ Id: id }));
  const dist = out.Distribution;
  const cfg = dist?.DistributionConfig;

  const comment = cfg?.Comment?.trim();
  if (comment) return { label: comment, fetchError: null };

  const domain = dist?.DomainName?.trim();
  if (domain) return { label: domain, fetchError: null };

  const aliases = cfg?.Aliases?.Items;
  const firstAlias = aliases?.find((a) => Boolean(a?.trim()));
  if (firstAlias?.trim()) return { label: firstAlias.trim(), fetchError: null };

  return { label: null, fetchError: null };
}

export async function fetchCloudFrontDistributionLabel(
  distributionId: string,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<{ label: string | null; fetchError: string | null }> {
  try {
    return await Promise.race([
      fetchLabelInner(distributionId, accessKeyId, secretAccessKey),
      new Promise<{ label: null; fetchError: string }>((resolve) =>
        setTimeout(() => resolve({ label: null, fetchError: "Timeout menghubungi AWS (8s)" }), AWS_TIMEOUT_MS),
      ),
    ]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return { label: null, fetchError: msg.slice(0, 240) };
  }
}
