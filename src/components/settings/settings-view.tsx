"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HowToUse } from "@/components/how-to-use";
import { useAppState } from "@/context/app-state";

export function SettingsView() {
  const { resetAll, state } = useAppState();

  function clearData() {
    resetAll();
    toast.success("Local project data cleared.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>How to Use TeamPilot</CardTitle>
          <CardDescription>
            Another team leader should be able to run this prototype independently with these steps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HowToUse />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
          <CardDescription>
            The OpenAI key stays on the server in OPENAI_API_KEY. Never paste it into this interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Put <code>OPENAI_API_KEY</code> in <code>.env</code> or <code>.env.local</code> and restart
            <code> npm run dev</code>. Optional: set <code>OPENAI_MODEL</code> to a current supported
            model. The default is <code>gpt-4o-mini</code>.
          </p>
          <p>
            Current browser workspace: {state.project.name.trim() || "no named project"} ·{" "}
            {state.plan ? `${state.plan.tasks.length} tasks stored` : "no generated plan"} ·{" "}
            {state.meetingAnalysis ? "meeting analysis saved" : "no meeting analysis"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Local data</CardTitle>
          <CardDescription>
            This prototype stores project data in browser localStorage only. Clearing it cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={clearData}>
            Clear saved project
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
