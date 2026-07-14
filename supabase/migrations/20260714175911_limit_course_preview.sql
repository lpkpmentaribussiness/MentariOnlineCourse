update public.lessons
set is_preview = (application = 'Word' and position = 1)
where is_exam = false;
