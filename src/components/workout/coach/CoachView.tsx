import { useMemo, useState } from "react";
import { WORKOUT_TEMPLATES } from "../../../data/workout-templates";
import {
  getTemplate,
  scoreTemplates,
} from "../../../utils/workout-recommendation";
import { cloneTemplateDays, newId } from "../../../utils/workout-storage";
import type {
  Equipment,
  ExperienceLevel,
  PreferredStyle,
  QuestionnaireAnswers,
  TrainingGoal,
} from "../types";
import { createPlanShell } from "../state/workout-reducer";
import { useSetTab, useWorkout } from "../state/WorkoutContext";
import {
  Badge,
  Button,
  Input,
  Label,
  Panel,
  SectionTitle,
  Select,
  TextArea,
} from "../shared/ui";

const EQUIPMENT_OPTIONS: Equipment[] = [
  "barbell",
  "dumbbell",
  "kettlebell",
  "cable",
  "machine",
  "bodyweight",
  "band",
  "pull-up-bar",
  "bench",
  "cardio-machine",
];

export function CoachView() {
  const { state, dispatch } = useWorkout();
  const setTab = useSetTab();
  const existing = state.store.questionnaire;

  const [answers, setAnswers] = useState<QuestionnaireAnswers>(
    existing ?? {
      goal: "general-fitness",
      experience: "beginner",
      daysPerWeek: 3,
      sessionMinutes: 45,
      equipment: ["bodyweight", "dumbbell"],
      preferredStyle: "full-body",
      mobilityNeeds: false,
      limitations: "",
      completedAt: Date.now(),
    },
  );
  const [submitted, setSubmitted] = useState(Boolean(existing));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  const ranked = useMemo(
    () => (submitted ? scoreTemplates(answers) : []),
    [answers, submitted],
  );
  const top = ranked.find((r) => r.templateId === selectedTemplateId) ?? ranked[0];
  const topTemplate = top ? getTemplate(top.templateId) : null;

  const toggleEquipment = (item: Equipment) => {
    setAnswers((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter((e) => e !== item)
        : [...prev.equipment, item],
    }));
  };

  const saveRecommendation = () => {
    if (!topTemplate || !top) return;
    const limitedDays = topTemplate.days.slice(0, top.adaptedDaysPerWeek);
    const plan = createPlanShell({
      name: `${topTemplate.name} (Recommended)`,
      description: topTemplate.description,
      goal: topTemplate.goal,
      source: "recommended",
      templateId: topTemplate.id,
      daysPerWeek: top.adaptedDaysPerWeek,
      estimatedMinutes: top.adaptedMinutes,
      experience: answers.experience,
      equipment: answers.equipment,
      days: cloneTemplateDays(
        limitedDays.map((d, i) => ({ ...d, id: newId("day"), order: i })),
      ),
      notes: top.reasons.join(" · "),
    });
    dispatch({
      type: "SAVE_QUESTIONNAIRE",
      answers: { ...answers, completedAt: Date.now() },
    });
    dispatch({ type: "UPSERT_PLAN", plan });
    dispatch({ type: "SET_ACTIVE_PLAN", planId: plan.id });
    setTab("plans");
  };

  return (
    <div className="wo-page space-y-4">
      <div className="wo-page__intro wo-page__intro--desktop">
        <SectionTitle
          title="Coach"
          subtitle="Answer a few questions and get an explainable plan recommendation."
        />
      </div>

      <Panel>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="goal">Goal</Label>
            <Select
              id="goal"
              value={answers.goal}
              onChange={(e) =>
                setAnswers((p) => ({
                  ...p,
                  goal: e.target.value as TrainingGoal,
                }))
              }
            >
              <option value="strength">Strength</option>
              <option value="hypertrophy">Hypertrophy</option>
              <option value="fat-loss">Fat loss</option>
              <option value="endurance">Endurance</option>
              <option value="mobility">Mobility</option>
              <option value="general-fitness">General fitness</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="experience">Experience</Label>
            <Select
              id="experience"
              value={answers.experience}
              onChange={(e) =>
                setAnswers((p) => ({
                  ...p,
                  experience: e.target.value as ExperienceLevel,
                }))
              }
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="days">Days / week</Label>
            <Input
              id="days"
              type="number"
              min={2}
              max={6}
              value={answers.daysPerWeek}
              onChange={(e) =>
                setAnswers((p) => ({
                  ...p,
                  daysPerWeek: Number(e.target.value) || 3,
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="mins">Session minutes</Label>
            <Input
              id="mins"
              type="number"
              min={20}
              max={120}
              value={answers.sessionMinutes}
              onChange={(e) =>
                setAnswers((p) => ({
                  ...p,
                  sessionMinutes: Number(e.target.value) || 45,
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="style">Preferred style</Label>
            <Select
              id="style"
              value={answers.preferredStyle}
              onChange={(e) =>
                setAnswers((p) => ({
                  ...p,
                  preferredStyle: e.target.value as PreferredStyle,
                }))
              }
            >
              <option value="full-body">Full body</option>
              <option value="upper-lower">Upper / lower</option>
              <option value="push-pull-legs">Push / pull / legs</option>
              <option value="body-part-split">Body-part split</option>
              <option value="circuit">Circuit</option>
              <option value="home">Home</option>
            </Select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={answers.mobilityNeeds}
                onChange={(e) =>
                  setAnswers((p) => ({
                    ...p,
                    mobilityNeeds: e.target.checked,
                  }))
                }
              />
              Prioritize mobility / recovery
            </label>
          </div>
          <div className="md:col-span-2">
            <Label>Available equipment</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((item) => (
                <Button
                  key={item}
                  variant={answers.equipment.includes(item) ? "primary" : "secondary"}
                  onClick={() => toggleEquipment(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="limits">Limitations / notes</Label>
            <TextArea
              id="limits"
              value={answers.limitations}
              onChange={(e) =>
                setAnswers((p) => ({ ...p, limitations: e.target.value }))
              }
              placeholder="e.g. training at home, knee-friendly options…"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => {
              setSubmitted(true);
              setSelectedTemplateId(null);
            }}
          >
            Recommend plan
          </Button>
          <Button onClick={() => setSubmitted(false)}>Retake</Button>
        </div>
      </Panel>

      {submitted && top && topTemplate ? (
        <Panel className="wo-coach-result">
          <SectionTitle
            title={`Recommended: ${topTemplate.name}`}
            subtitle={`Score ${top.score} · adapted to ${top.adaptedDaysPerWeek} days / ~${top.adaptedMinutes} min`}
          />
          <p className="mb-3 text-sm">{topTemplate.description}</p>
          <div className="mb-3 flex flex-wrap gap-2 wo-coach-result__reasons">
            {top.reasons.map((reason) => (
              <Badge key={reason}>{reason}</Badge>
            ))}
          </div>
          <div className="mb-4 grid gap-2 md:grid-cols-2">
            {ranked.slice(0, 4).map((item) => {
              const template = WORKOUT_TEMPLATES.find((t) => t.id === item.templateId);
              if (!template) return null;
              return (
                <button
                  key={item.templateId}
                  type="button"
                  className={`wo-list-row text-left ${
                    item.templateId === top.templateId ? "ring-1 ring-orange-500/50" : ""
                  }`}
                  onClick={() => setSelectedTemplateId(item.templateId)}
                >
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="wo-muted text-xs">{item.reasons[0]}</div>
                  </div>
                  <Badge>{item.score}</Badge>
                </button>
              );
            })}
          </div>
          <Button variant="primary" onClick={saveRecommendation}>
            Save as my plan
          </Button>
          <p className="wo-muted mt-3 text-xs">
            Guidance only — not medical advice. Adjust volume if you feel pain or excessive fatigue.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}
