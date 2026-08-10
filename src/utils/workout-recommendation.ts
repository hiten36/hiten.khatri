import { WORKOUT_TEMPLATES } from "../data/workout-templates";
import type {
  BuiltInTemplate,
  QuestionnaireAnswers,
  RecommendationResult,
} from "../components/workout/types";

function equipmentOverlap(
  preferred: QuestionnaireAnswers["equipment"],
  templateEquipment: BuiltInTemplate["equipment"],
) {
  if (preferred.length === 0) return 0.5;
  const set = new Set(preferred);
  const hits = templateEquipment.filter((item) => set.has(item)).length;
  return hits / Math.max(templateEquipment.length, 1);
}

export function scoreTemplates(
  answers: QuestionnaireAnswers,
): RecommendationResult[] {
  return WORKOUT_TEMPLATES.map((template) => {
    const reasons: string[] = [];
    let score = 0;

    if (template.goal === answers.goal) {
      score += 40;
      reasons.push(`Matches your ${answers.goal.replace("-", " ")} goal`);
    } else if (
      (answers.goal === "general-fitness" &&
        ["hypertrophy", "strength", "endurance"].includes(template.goal)) ||
      (answers.goal === "fat-loss" &&
        ["endurance", "general-fitness"].includes(template.goal))
    ) {
      score += 18;
      reasons.push("Closely aligned secondary goal fit");
    }

    if (template.experience === answers.experience) {
      score += 20;
      reasons.push(`Tuned for ${answers.experience} trainees`);
    } else if (
      (answers.experience === "beginner" && template.experience === "intermediate") ||
      (answers.experience === "advanced" && template.experience === "intermediate")
    ) {
      score += 8;
    }

    const dayDiff = Math.abs(template.daysPerWeek - answers.daysPerWeek);
    score += Math.max(0, 15 - dayDiff * 5);
    if (dayDiff === 0) reasons.push(`Fits ${answers.daysPerWeek} training days`);

    const minuteDiff = Math.abs(template.estimatedMinutes - answers.sessionMinutes);
    score += Math.max(0, 10 - Math.floor(minuteDiff / 10));

    const overlap = equipmentOverlap(answers.equipment, template.equipment);
    score += Math.round(overlap * 15);
    if (overlap > 0.6) reasons.push("Works with your available equipment");

    if (template.style === answers.preferredStyle) {
      score += 12;
      reasons.push(`Uses your preferred ${answers.preferredStyle} style`);
    }

    if (answers.mobilityNeeds && template.goal === "mobility") {
      score += 15;
      reasons.push("Includes mobility-first work");
    } else if (answers.mobilityNeeds && template.tags.includes("recovery")) {
      score += 6;
    }

    if (
      answers.limitations.toLowerCase().includes("home") &&
      template.style === "home"
    ) {
      score += 10;
      reasons.push("Designed for home training");
    }

    const adaptedDaysPerWeek = Math.min(
      Math.max(answers.daysPerWeek, 2),
      template.days.length,
    );
    const adaptedMinutes = Math.round(
      (template.estimatedMinutes + answers.sessionMinutes) / 2,
    );

    return {
      templateId: template.id,
      score,
      reasons: reasons.slice(0, 4),
      adaptedDaysPerWeek,
      adaptedMinutes,
    };
  }).sort((a, b) => b.score - a.score);
}

export function recommendPlan(
  answers: QuestionnaireAnswers,
): RecommendationResult {
  const ranked = scoreTemplates(answers);
  return ranked[0] ?? {
    templateId: WORKOUT_TEMPLATES[0].id,
    score: 0,
    reasons: ["Default beginner full-body plan"],
    adaptedDaysPerWeek: answers.daysPerWeek,
    adaptedMinutes: answers.sessionMinutes,
  };
}

export function getTemplate(templateId: string): BuiltInTemplate | undefined {
  return WORKOUT_TEMPLATES.find((template) => template.id === templateId);
}
