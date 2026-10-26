"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { completeSetup, type SetupState } from "@/lib/actions/setup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SetupState = {};

function Field({
  id,
  label,
  hint,
  ...props
}: React.ComponentProps<typeof Input> & { id: string; label: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} className="h-11" {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SetupForm({ requireCode }: { requireCode: boolean }) {
  const [state, formAction, pending] = useActionState(completeSetup, initialState);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="glass-strong rounded-2xl p-5 shadow-2xl sm:p-8"
    >
      <form action={formAction} className="space-y-6">
        {requireCode ? (
          <Field
            id="setupCode"
            label="Setup code"
            autoComplete="off"
            required
            hint="The code you received with your CountBook link."
          />
        ) : (
          <input type="hidden" name="setupCode" value="" />
        )}

        <fieldset className="space-y-4">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your business
          </legend>
          <Field
            id="businessName"
            label="Business name"
            placeholder="e.g. Prime Gadgets Ltd"
            autoComplete="organization"
            required
            hint="Printed on receipts. You can add the address and contacts later in Settings."
          />
          <div className="grid grid-cols-[1fr_6.5rem] gap-3">
            <Field
              id="warehouseName"
              label="First store / warehouse"
              defaultValue="Main Store"
              required
            />
            <Field
              id="warehouseCode"
              label="Code"
              defaultValue="MAIN"
              maxLength={8}
              autoCapitalize="characters"
              className="h-11 font-mono uppercase"
              required
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your admin account
          </legend>
          <Field id="name" label="Your name" autoComplete="name" required />
          <Field id="email" label="Email" type="email" autoComplete="email" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Field
              id="confirm"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </fieldset>

        {state.error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="size-4 shrink-0" />
            {state.error}
          </motion.p>
        )}

        <Button type="submit" disabled={pending} className="h-11 w-full text-sm font-semibold">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Setting up…
            </>
          ) : (
            "Create workspace"
          )}
        </Button>
      </form>
    </motion.div>
  );
}
