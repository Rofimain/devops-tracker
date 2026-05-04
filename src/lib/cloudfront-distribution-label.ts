import { CloudFrontClient, GetDistributionCommand } from "@aws-sdk/client-cloudfront";

const CLOUDFRONT_API_REGION = "us-east-1";

/**
 * Label manusiawi untuk distribution: Comment di konsol, lalu domain *.cloudfront.net, lalu alias pertama.
 */
export async function fetchCloudFrontDistributionLabel(
  distributionId: string,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<{ label: string | null; fetchError: string | null }> {
  const id = distributionId.trim();
  if (!id) return { label: null, fetchError: null };

  try {
    const client = new CloudFrontClient({
      region: CLOUDFRONT_API_REGION,
      credentials: { accessKeyId, secretAccessKey },
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return { label: null, fetchError: msg.slice(0, 240) };
  }
}
