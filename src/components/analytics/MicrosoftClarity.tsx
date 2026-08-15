import Script from "next/script";

function isHostedProduction() {
  // Vercel sets this on the deployed production host only.
  // Local `next dev` / `next start` and preview deploys stay off.
  return process.env.VERCEL_ENV === "production";
}

export function MicrosoftClarity() {
  if (!isHostedProduction()) return null;

  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
  if (!projectId) return null;

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        var h=l.location.hostname;
        if(h==="localhost"||h==="127.0.0.1"||h==="0.0.0.0"||h==="[::1]"||h.endsWith(".local"))return;
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script","${projectId}");`}
    </Script>
  );
}
