import { describe, expect, it } from "vitest";
import { CaptureError, captureProviderFromEnv, validateCaptureUrl } from "@/lib/capture";

describe("validateCaptureUrl (SSRF guard)", () => {
  it("accepts public http(s) pages and adds https to bare domains", () => {
    expect(validateCaptureUrl("https://example.com/offer?x=1")).toMatchObject({ ok: true });
    expect(validateCaptureUrl("example.com")).toEqual({ ok: true, url: "https://example.com/" });
  });
  it.each(["", "ftp://example.com", "javascript:alert(1)", "http://localhost:3000", "http://127.0.0.1", "http://10.0.0.5", "http://192.168.1.1", "http://172.20.0.1", "http://169.254.169.254/latest", "http://[::1]/", "http://foo.local", "http://intranet", "https://user:pw@example.com", "https://example.com:8443", "http://0.0.0.0"])("refuses %s", (u) => {
    expect(validateCaptureUrl(u).ok).toBe(false);
  });
});

describe("captureProviderFromEnv", () => {
  it("is off without a template containing {url}", () => {
    expect(captureProviderFromEnv({})).toBeNull();
    expect(captureProviderFromEnv({ CAPTURE_URL_TEMPLATE: "https://x.test/shot" })).toBeNull();
  });
  it("encodes the page address into the template and checks the answer is an image", async () => {
    let seen = "";
    const ok = (async (u: string) => ((seen = u), new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/png" } }))) as unknown as typeof fetch;
    const p = captureProviderFromEnv({ CAPTURE_URL_TEMPLATE: "https://x.test/shot?url={url}" }, ok)!;
    expect((await p.capture("https://example.com/a?b=c")).type).toBe("image/png");
    expect(seen).toBe("https://x.test/shot?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3Dc");
    const html = (async () => new Response("<html>", { headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
    await expect(captureProviderFromEnv({ CAPTURE_URL_TEMPLATE: "https://x.test/?u={url}" }, html)!.capture("https://example.com")).rejects.toMatchObject({ code: "bad_image" });
    const down = (async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    await expect(captureProviderFromEnv({ CAPTURE_URL_TEMPLATE: "https://x.test/?u={url}" }, down)!.capture("https://example.com")).rejects.toBeInstanceOf(CaptureError);
  });
});
