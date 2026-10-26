"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = "unknown" | "installed" | "promptable" | "ios" | "unsupported";

export function InstallAppCard() {
  const [state, setState] = useState<InstallState>("unknown");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

    // Detect once on mount; the prompt event (if any) upgrades it below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(standalone ? "installed" : ios ? "ios" : "unsupported");

    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setState("promptable");
    }
    function onInstalled() {
      setDeferred(null);
      setState("installed");
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setState("installed");
    setDeferred(null);
  }

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center gap-2">
        <Smartphone className="size-4 text-primary" />
        <CardTitle className="text-base">CountBook app</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {state === "installed" && (
          <p className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-4" /> Installed on this device.
          </p>
        )}
        {state === "promptable" && (
          <>
            <p className="text-muted-foreground">
              Install CountBook on this device for a full-screen app with a home
              screen icon.
            </p>
            <Button onClick={install} className="font-semibold">
              <Download className="size-4" /> Install app
            </Button>
          </>
        )}
        {state === "ios" && (
          <p className="text-muted-foreground">
            To install on iPhone or iPad, tap{" "}
            <Share className="inline size-4 align-text-bottom" />{" "}
            <span className="font-medium text-foreground">Share</span> in Safari,
            then <span className="font-medium text-foreground">Add to Home Screen</span>.
          </p>
        )}
        {(state === "unsupported" || state === "unknown") && (
          <p className="text-muted-foreground">
            Open CountBook in Chrome, Edge or Safari on your phone and use{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span>{" "}
            / <span className="font-medium text-foreground">Install app</span> from
            the browser menu to install it.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
