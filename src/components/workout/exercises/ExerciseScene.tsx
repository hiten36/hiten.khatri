import { useEffect, useMemo, useState } from "react";
import { getExerciseGifUrl } from "../../../data/exercise-gifs";
import type { Exercise } from "../types";

export function ExerciseScene({ exercise }: { exercise: Exercise }) {
  const mediaUrl = useMemo(
    () => exercise.demo.gifUrl || getExerciseGifUrl(exercise.id),
    [exercise],
  );
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    setFailed(false);
    setLoading(true);
  }, [mediaUrl]);

  if (!mediaUrl || failed) {
    return (
      <div className="wo-gif-fallback">
        <p className="font-medium">{exercise.name} form guide</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {exercise.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="wo-muted mt-2 text-xs">
          Animation unavailable — showing text cues instead.
        </p>
      </div>
    );
  }

  if (reducedMotion) {
    return (
      <div className="wo-gif-fallback">
        <p className="font-medium">{exercise.name} form guide</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {exercise.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="wo-muted mt-2 text-xs">
          Reduced motion is on — showing text cues instead of animation.
        </p>
      </div>
    );
  }

  return (
    <div className="wo-gif">
      <div className="wo-gif__frame">
        {loading ? (
          <p className="wo-muted absolute z-10 text-sm">Loading form media…</p>
        ) : null}
        <img
          key={mediaUrl}
          src={mediaUrl}
          alt={`${exercise.name} form demonstration`}
          width={400}
          height={400}
          loading="eager"
          decoding="async"
          style={{ opacity: loading ? 0.2 : 1, transition: "opacity 0.2s ease" }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
      </div>
      <p className="wo-muted mt-2 text-xs">
        Form demonstration for {exercise.name}. Educational guide only — stop if
        you feel sharp pain.
      </p>
    </div>
  );
}
