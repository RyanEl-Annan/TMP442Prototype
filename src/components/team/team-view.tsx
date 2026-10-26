"use client";

import Link from "next/link";
import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { useAppState } from "@/context/app-state";
import { getWorkload } from "@/lib/stats";

export function TeamView() {
  const { ready, state, addMember, updateMember, removeMember, updateProject } = useAppState();
  if (!ready) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  const named = state.project.members.filter((member) => member.name.trim());
  const workload = getWorkload(state.project, state.plan);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Roster</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep member skills and availability current so later plans stay fair.
          </p>
        </div>
        <Button onClick={addMember}>
          <Plus className="size-4" />
          Add member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team charter</CardTitle>
          <CardDescription>Optional working agreements included with each generation request.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={state.project.teamCharter}
            onChange={(event) => updateProject({ teamCharter: event.target.value })}
          />
        </CardContent>
      </Card>

      {state.project.members.length === 0 ? (
        <EmptyState
          icon={<Users className="size-4" />}
          title="No teammates yet"
          description="Add people here or from the New Project workflow."
          action={
            <Button asChild>
              <Link href="/new-project">Open New Project</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {state.project.members.map((member) => {
            const load = workload.find((row) => row.memberId === member.id);
            return (
              <Card key={member.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>{member.name || "Unnamed member"}</CardTitle>
                    <CardDescription>
                      {load
                        ? `${load.taskCount} assigned tasks · ${load.estimatedHours} estimated hours`
                        : "No assigned tasks yet"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember(member.id)}
                    disabled={state.project.members.length === 1}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`team-name-${member.id}`}>Name</Label>
                    <Input
                      id={`team-name-${member.id}`}
                      value={member.name}
                      onChange={(event) => updateMember(member.id, { name: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`team-hours-${member.id}`}>Weekly availability (hours)</Label>
                    <Input
                      id={`team-hours-${member.id}`}
                      type="number"
                      min={1}
                      max={80}
                      value={member.weeklyHours}
                      onChange={(event) =>
                        updateMember(member.id, { weeklyHours: Number(event.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`team-skills-${member.id}`}>Strengths and skills</Label>
                    <Textarea
                      id={`team-skills-${member.id}`}
                      rows={2}
                      value={member.skills}
                      onChange={(event) => updateMember(member.id, { skills: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`team-interests-${member.id}`}>Preferred tasks or interests</Label>
                    <Textarea
                      id={`team-interests-${member.id}`}
                      rows={2}
                      value={member.interests}
                      onChange={(event) => updateMember(member.id, { interests: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`team-notes-${member.id}`}>Notes</Label>
                    <Textarea
                      id={`team-notes-${member.id}`}
                      rows={2}
                      value={member.notes}
                      onChange={(event) => updateMember(member.id, { notes: event.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!named.length ? (
        <p className="text-sm text-muted-foreground">
          Named members are required before generating a plan.
        </p>
      ) : null}
    </div>
  );
}
