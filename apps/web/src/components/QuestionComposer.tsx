import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createQuestionSchema, type CreateQuestionInput } from "@asq/shared";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Spinner } from "./Spinner";
import { useToast } from "./Toast";

export function QuestionComposer({
  onPosted,
}: {
  onPosted: (result: { uri: string; cid: string; authorDid: string }) => void;
}) {
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateQuestionInput>({
    resolver: zodResolver(createQuestionSchema),
    defaultValues: { title: "", body: "", tags: [] },
    mode: "onChange",
  });

  const tags = watch("tags") ?? [];
  const title = watch("title") ?? "";
  const body = watch("body") ?? "";

  const [tagDraft, setTagDraft] = useState("");

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (tags.includes(tag)) {
      setTagDraft("");
      return;
    }
    if (tags.length >= 5) return;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(tag) || tag.length > 24) return;
    setValue("tags", [...tags, tag], { shouldValidate: true });
    setTagDraft("");
  };

  const removeTag = (tag: string) => {
    setValue(
      "tags",
      tags.filter((t) => t !== tag),
      { shouldValidate: true },
    );
  };

  const post = useMutation({
    mutationFn: (data: CreateQuestionInput) => api.createQuestion(data),
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to post";
      setServerError(msg);
      toast.push("error", msg);
    },
    onSuccess: (result) => {
      setServerError(null);
      toast.push("success", "Question posted.");
      onPosted(result);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => {
        setServerError(null);
        post.mutate(data);
      })}
    >
      <div className="form-step">
        <div className="form-step__head">
          <span className="form-step__num">1</span>
          <h3 className="form-step__title">the question</h3>
          <span className="form-step__hint">10–300 chars</span>
        </div>
        <div className="form-step__body">
          <p className="help">
            Phrase it like you'd ask a friend. End with a question mark.
          </p>
          <label htmlFor="q-title" className="sr-only">
            Title
          </label>
          <input
            id="q-title"
            autoFocus
            {...register("title")}
            className="input-big"
            placeholder="why does…?"
          />
          <div className={`counter${title.length > 300 ? " over" : ""}`}>
            {title.length} / 300
          </div>
          {errors.title ? (
            <p className="mono" style={{ color: "var(--red)", marginTop: 4 }}>
              {errors.title.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="form-step">
        <div className="form-step__head">
          <span className="form-step__num">2</span>
          <h3 className="form-step__title">the details</h3>
          <span className="form-step__hint">markdown OK · up to 10k</span>
        </div>
        <div className="form-step__body">
          <p className="help">
            Context helps. What have you tried? Where are you stuck?
          </p>
          <label htmlFor="q-body" className="sr-only">
            Details
          </label>
          <textarea
            id="q-body"
            {...register("body")}
            className="textarea"
            rows={10}
            placeholder="Add context. Markdown is supported."
          />
          <div className={`counter${body.length > 10000 ? " over" : ""}`}>
            {body.length} / 10000
          </div>
          {errors.body ? (
            <p className="mono" style={{ color: "var(--red)", marginTop: 4 }}>
              {errors.body.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="form-step">
        <div className="form-step__head">
          <span className="form-step__num">3</span>
          <h3 className="form-step__title">the stacks</h3>
          <span className="form-step__hint">up to 5 tags</span>
        </div>
        <div className="form-step__body">
          <p className="help">
            Type a tag and press Enter. Lowercase, letters/numbers/dashes.
          </p>
          <div className="tag-input-row">
            {tags.map((tag) => (
              <span key={tag} className="tag-token">
                #{tag}
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => removeTag(tag)}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " " || e.key === ",") {
                  e.preventDefault();
                  addTag(tagDraft);
                } else if (e.key === "Backspace" && !tagDraft && tags.length) {
                  removeTag(tags[tags.length - 1]!);
                }
              }}
              onBlur={() => {
                if (tagDraft.trim()) addTag(tagDraft);
              }}
              placeholder={tags.length >= 5 ? "Max 5 tags" : "Add a tag"}
              disabled={tags.length >= 5}
            />
          </div>
        </div>
      </div>

      {serverError ? <div className="alert">{serverError}</div> : null}

      <div style={{ marginTop: "var(--s-4)" }}>
        <button
          type="submit"
          disabled={!isValid || isSubmitting || post.isPending}
          className="btn btn--primary"
        >
          {post.isPending ? (
            <>
              <Spinner /> POSTING
            </>
          ) : (
            "★ POST QUESTION →"
          )}
        </button>
      </div>
    </form>
  );
}
