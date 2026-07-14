import { fallbackCourses } from "@/lib/course-catalog";
import { createClient } from "@/lib/supabase/server";

export async function getPublicCourses() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .select("id, slug, title, short_description, description, price, level, status")
      .eq("status", "active")
      .order("price");
    if (error || !data?.length) return [...fallbackCourses];
    return data;
  } catch {
    return [...fallbackCourses];
  }
}

export async function getPublicCourse(slug: string) {
  const fallback = fallbackCourses.find((course) => course.slug === slug) ?? null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("courses")
      .select("id, slug, title, short_description, description, price, level, status")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return fallback ? { course: fallback, previewLessons: [] } : null;
    const { data: previewLessons } = await supabase
      .from("lessons")
      .select("id, application, title, description, video_url, position")
      .eq("course_id", data.id)
      .eq("is_preview", true)
      .order("position");
    return { course: data, previewLessons: previewLessons ?? [] };
  } catch {
    return fallback ? { course: fallback, previewLessons: [] } : null;
  }
}
