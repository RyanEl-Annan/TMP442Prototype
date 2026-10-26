import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

export function zodResolver<T extends z.ZodType>(schema: T): Resolver<z.infer<T> & FieldValues> {
  return (async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      let current: Record<string, unknown> = errors;
      issue.path.forEach((segment, index) => {
        const key = String(segment);
        if (index === issue.path.length - 1) {
          if (!current[key]) {
            current[key] = { type: issue.code, message: issue.message };
          }
          return;
        }
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      });
    }

    return { values: {}, errors };
  }) as Resolver<z.infer<T> & FieldValues>;
}
