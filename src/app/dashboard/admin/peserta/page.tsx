import { CheckCircle2, UserCog } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { requireProfile } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { updateEnrollment, updateParticipantProfile } from "../../actions";

export default async function ParticipantsPage({ searchParams }: { searchParams: Promise<{ pesan?: string; error?: string }> }) {
  await requireProfile(["admin"]);
  const { pesan, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: profiles }, { data: enrollments }, { data: payments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, role, is_active, created_at").order("created_at", { ascending: false }),
    supabase.from("enrollments").select("id, user_id, course_id, status, created_at, profiles!enrollments_user_id_fkey(full_name, phone), courses(title)").order("created_at", { ascending: false }),
    supabase.from("payments").select("id, user_id, course_id, amount, status, notes").order("created_at", { ascending: false }),
  ]);

  return <div>
    <header className="dashboard-heading">
      <p className="eyebrow">Administrasi peserta</p><h1>Peserta & akses</h1>
      <p>Verifikasi pembayaran, aktifkan enrollment, dan atur peran akun.</p>
      {(pesan || error) && <div className={error ? "alert alert-error" : "alert alert-success"}>{error ?? pesan}</div>}
    </header>
    <section className="dashboard-section">
      <div className="dashboard-section-head"><div><p className="eyebrow">Permintaan terbaru</p><h2>Aktivasi kursus</h2></div></div>
      <div className="table-wrap"><table>
        <thead><tr><th>Peserta</th><th>Program</th><th>Pembayaran</th><th>Status akses</th><th>Tindakan</th></tr></thead>
        <tbody>{enrollments?.map((enrollment) => {
          const participant = Array.isArray(enrollment.profiles) ? enrollment.profiles[0] : enrollment.profiles;
          const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses;
          const payment = payments?.find((item) => item.user_id === enrollment.user_id && item.course_id === enrollment.course_id);
          return <tr key={enrollment.id}>
            <td><strong>{participant?.full_name}</strong><small>{participant?.phone ?? "Tanpa nomor"}<br />{formatDate(enrollment.created_at)}</small></td>
            <td>{course?.title}</td>
            <td>{payment ? <><strong>{formatCurrency(payment.amount)}</strong><small>{payment.status}</small>{payment.notes && <small>{payment.notes}</small>}</> : "-"}</td>
            <td><StatusPill status={enrollment.status} /></td>
            <td><form action={updateEnrollment} className="payment-access-form">
              <input type="hidden" name="enrollmentId" value={enrollment.id} />
              <input type="hidden" name="paymentId" value={payment?.id ?? ""} />
              <label>Pembayaran<select name="paymentStatus" defaultValue={payment?.status ?? "pending"}><option value="pending">Menunggu</option><option value="verified">Terverifikasi</option><option value="rejected">Ditolak</option></select></label>
              <label>Akses<select name="status" defaultValue={enrollment.status}><option value="pending">Menunggu</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label>
              <label className="payment-note">Catatan<input name="paymentNotes" defaultValue={payment?.notes ?? ""} placeholder="Referensi transfer atau alasan penolakan" /></label>
              <button className="icon-button" title="Simpan pembayaran dan akses" aria-label="Simpan pembayaran dan akses"><CheckCircle2 /></button>
            </form></td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>
    <section className="dashboard-section">
      <div className="dashboard-section-head"><div><p className="eyebrow">Hak akses</p><h2>Semua akun</h2></div></div>
      <div className="table-wrap"><table>
        <thead><tr><th>Nama</th><th>Kontak</th><th>Peran</th><th>Akun</th><th></th></tr></thead>
        <tbody>{profiles?.map((item) => <tr key={item.id}>
          <td><strong>{item.full_name}</strong><small>Terdaftar {formatDate(item.created_at)}</small></td><td>{item.phone ?? "-"}</td>
          <td colSpan={3}><form action={updateParticipantProfile} className="role-form"><input type="hidden" name="userId" value={item.id} /><select name="role" defaultValue={item.role}><option value="participant">Peserta</option><option value="instructor">Pengajar</option><option value="admin">Admin</option></select><select name="isActive" defaultValue={String(item.is_active)}><option value="true">Aktif</option><option value="false">Nonaktif</option></select><SubmitButton className="button button-outline"><UserCog size={16} /> Simpan</SubmitButton></form></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </div>;
}
